import os
import json
import time
import requests
from web3 import Web3
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURATION ---
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
WEB3_URL = os.getenv("WEB3_PROVIDER_URI", "http://127.0.0.1:7545")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
PINATA_JWT = os.getenv("PINATA_JWT") 

# ⚠️ CONFIRM THIS IS YOUR LATEST CONTRACT ADDRESS
CONTRACT_ADDRESS = "0xb2fe60515dDeD9Ad2bEC78dC87D0274879853FD3" 
FALLBACK_CID = "QmYv32Di2u9Pqn8aNkrKoTPgokNPZX5LeEiteSqCfxnmAy"
CHAIN_ID = 1337
ART_STYLE = "Isometric view,Miniature, orthographic camera, 3D render, high angle, diorama style, detailed dungeon crawler environment, Unreal Engine 5, volumetric lighting"
CAMPAIGN_LORE = """
SETTING: The Cursed Spire of Malachar.
STARTING LOCATION: The Fungal Basement (Floor 1).
VILLAIN: Malachar the Time-Lich.
GOAL: Escape the basement and climb the tower.
"""

# --- SETUP ---
genai.configure(api_key=GEMINI_KEY)
w3 = Web3(Web3.HTTPProvider(WEB3_URL))
account = w3.eth.account.from_key(PRIVATE_KEY)

try:
    with open("abi.json", "r") as f:
        CONTRACT_ABI = json.load(f)
except FileNotFoundError:
    print("CRITICAL: abi.json missing.")
    exit()

contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
print(f"🎨 Visual Game Master Online (Robust Mode).")

# --- HELPER: CRASH-PROOF TRANSACTION EXTRACTOR ---
def get_raw_tx(signed_tx):
    # Attempt 1: Standard Attribute
    raw = getattr(signed_tx, 'rawTransaction', None)
    if raw is not None: return raw
    
    # Attempt 2: Dictionary Access
    try:
        if isinstance(signed_tx, dict): return signed_tx.get('rawTransaction')
    except: pass

    # Attempt 3: Tuple Index
    try: return signed_tx[0]
    except: pass
        
    raise ValueError(f"Could not extract rawTransaction from {type(signed_tx)}")

# --- PINATA UPLOADER ---
def upload_to_pinata(file_path):
    print("   ☁️  Uploading to Pinata...")
    url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
    headers = { "Authorization": f"Bearer {PINATA_JWT}" }

    try:
        with open(file_path, 'rb') as f:
            response = requests.post(url, files={'file': f}, headers=headers)
            if response.status_code == 200:
                cid = response.json()['IpfsHash']
                print(f"   🚀 Pinned! CID: {cid}")
                return cid
            else:
                print(f"   ❌ Pinata Error: {response.text}")
                return None
    except Exception as e:
        print(f"   ⚠️ Upload Failed: {e}")
        return None

# --- IMAGE GENERATION (With Timeout Retry) ---
def generate_image(prompt, token_id):
    encoded_prompt = requests.utils.quote(prompt)
    print(f"   🎨 Painting: '{prompt[:30]}...'")
    
    API_URL = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=512&height=512&seed={token_id}&nologo=true"
    temp_file = f"temp_{token_id}.png"
    
    # Retry Loop
    for attempt in range(1, 3):
        try:
            # Increased timeout to 60s
            response = requests.get(API_URL, timeout=60)
            if response.status_code == 200:
                with open(temp_file, "wb") as f:
                    f.write(response.content)
                
                cid = upload_to_pinata(temp_file)
                
                if os.path.exists(temp_file):
                    os.remove(temp_file)
                
                return cid
            else:
                print(f"   ⚠️ Attempt {attempt}: Server busy ({response.status_code})")
        
        except requests.exceptions.ReadTimeout:
            print(f"   ⚠️ Attempt {attempt}: Timeout (Image took too long)")
        except Exception as e:
            print(f"   ⚠️ Attempt {attempt}: Error {e}")
        
        time.sleep(2) # Wait before retry

    print("   ❌ Image Gen Failed after retries. Using Fallback.")
    return None

# --- AI: THE PROLOGUE GENERATOR (New!) ---
def get_ai_prologue(hero_name):
    print(f"   🧠 AI generating prologue for {hero_name}...")
    model = genai.GenerativeModel('gemini-2.5-pro') 
    
    prompt = f"""
    You are a Dungeon Master running a game.
    HERO: {hero_name}
    LOCATION: The Fungal Basement (Campaign Start).

    TASK: Write a 2-sentence intro for this hero.
    
    CRITICAL RULE:
    The output text MUST end with a specific question asking the player what to do.
    - BAD: "A zombie blocks the path." (User doesn't know what to do).
    - GOOD: "A zombie blocks the path. Do you draw your sword or try to sneak past?"

    GENERATE JSON:
    {{
        "story": "[Describe the scene]. [Describe the threat]. [ASK THE QUESTION]?",
        "image_prompt": "Isometric view of {hero_name} in a fungal dungeon, {ART_STYLE}",
        "xp": 0
    }}
    """
    try:
        response = model.generate_content(prompt)
        text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception as e:
        print(f"   ⚠️ AI Error: {e}")
        # Fallback that ALWAYS asks a question
        return {
            "story": f"You wake up in the dark tower. A zombie is staring at you. Do you attack it or run away?", 
            "image_prompt": f"Isometric view of {hero_name} in a dungeon, {ART_STYLE}", 
            "xp": 0
        }

# --- TEXT GENERATION (Context Aware) ---
def get_ai_story(current_xp, user_action, previous_story_context, hero_name):
    model = genai.GenerativeModel('gemini-2.5-pro') 
    level = int(current_xp) // 100
    
    prompt = f"""
    Role: Hardcore Dungeon Master.
    HERO: "{hero_name}" (Lvl {level})
    CONTEXT: "{previous_story_context}"
    ACTION: "{user_action}"
    
    ---------------------------------------------------
    ⚖️ JUDGMENT RULES (FOLLOW STRICTLY):
    1. **COWARDICE / ABSURDITY**: 
       - If action is "run", "hide", "dance", or makes no sense -> **XP MUST BE 0**.
       - Narrate a humiliating failure.
    
    2. **DEATH (Game Over)**:
       - If the Hero does something suicidal or fails a critical moment -> **XP IS 0**.
       - END THE STORY with the text: "[GAME OVER]".
    
    3. **VICTORY**:
       - If Hero defeats the final boss (Malachar) -> **XP IS 1000**.
       - END THE STORY with the text: "[VICTORY]".
    ---------------------------------------------------

    INSTRUCTIONS:
    - If [GAME OVER]: Image prompt must be "A dark tombstone with R.I.P {hero_name}, gloomy graveyard".
    - If [VICTORY]: Image prompt must be "{hero_name} sitting on a golden throne, god rays, epic loot".
    - Otherwise: Standard Isometric action shot.

    GENERATE JSON:
    {{
        "story": "Narrative... [Question or GAME OVER/VICTORY tag]", 
        "image_prompt": "...", 
        "xp": 0
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(text)
        
        # 🛡️ PYTHON SAFETY: Enforce 0 XP for logic words
        action_lower = user_action.lower()
        if "run" in action_lower or "hide" in action_lower or "wait" in action_lower:
            data['xp'] = 0 # Force punishment
            
        return data
    except Exception as e:
        print(f"AI Error: {e}")
        return {
            "story": "You stumble in confusion. What do you do?", 
            "image_prompt": f"Isometric view of {hero_name} confused", 
            "xp": 0
        }
    

# --- HANDLERS ---
def process_update(token_id, result):
    print(f"🤖 Story: {result['story'][:50]}...")
    cid = generate_image(result['image_prompt'], token_id)
    final_uri = f"ipfs://{cid}" if cid else "ipfs://QmYv32Di2u9Pqn8aNkrKoTPgokNPZX5LeEiteSqCfxnmAy"

    try:
        nonce = w3.eth.get_transaction_count(account.address)
        tx = contract.functions.resolveAdventure(
            token_id, result['story'], int(result.get('xp', 0)), final_uri
        ).build_transaction({
            'chainId': CHAIN_ID, 'gas': 3000000, 'gasPrice': w3.to_wei('20', 'gwei'), 'nonce': nonce
        })
        signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        w3.eth.send_raw_transaction(get_raw_tx(signed))
        print(f"✅ Blockchain Updated for Token {token_id}")
    except Exception as e:
        print(f"❌ Write Error: {e}")    
    
def handle_new_hero(token_id):
    print(f"\n--- 👶 NEW HERO BORN: Token {token_id} ---")
    try:
        hero_data = contract.functions.characters(token_id).call()
        name = hero_data[0]
        print(f"   Name: {name}")
        
        # GENERATE PROLOGUE
        result = get_ai_prologue(name)
        process_update(token_id, result)
        
    except Exception as e:
        print(f"New Hero Error: {e}")    

def handle_adventure(token_id, user_action):
    print(f"\n--- ⚔️ Handling Adventure for Token {token_id} ---")
    try:
        # Fetch current data
        hero_data = contract.functions.characters(token_id).call()
        name = hero_data[0]
        xp = hero_data[1]
        prev_story = hero_data[2]
        
        # GENERATE STORY & SAVE (process_update handles the blockchain write)
        result = get_ai_story(xp, user_action, prev_story, name) 
        process_update(token_id, result)
        
    except Exception as e:
        print(f"Adventure Error: {e}")

def listen_loop():
    print("👂 Listening for events...")
    filter_hero = contract.events.NewHeroRequested.create_filter(from_block='latest')
    filter_adv = contract.events.AdventureRequested.create_filter(from_block='latest')
    while True:
        try:
            # Check for New Heroes
            for event in filter_hero.get_new_entries():
                handle_new_hero(event['args']['tokenId'])

            for event in filter_adv.get_new_entries():
                handle_adventure(event['args']['tokenId'], event['args'].get('action', 'explores'))
            time.sleep(2)
        except Exception as e:
            print(f"Loop Error: {e}")
            time.sleep(2)

if __name__ == "__main__":
    listen_loop()
