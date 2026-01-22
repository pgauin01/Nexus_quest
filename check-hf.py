import os
import requests
from dotenv import load_dotenv

load_dotenv()

def check_token():
    token = os.getenv("HUGGINGFACE_API_KEY")
    headers = {"Authorization": f"Bearer {token}"}

    print(f"🔑 Checking token: {token[:4]}...{token[-4:]}")

    # WHOAMI check
    whoami = requests.get("https://huggingface.co/api/whoami-v2", headers=headers)
    if whoami.status_code != 200:
        print("❌ Token failed identity check")
        print(whoami.text)
        return
    
    print("✅ Token valid")

    print("\n🧪 Testing model access (v1-5)...")

    model_url = "https://router.huggingface.co/models/runwayml/stable-diffusion-v1-5"
    payload = {
        "inputs": "a robot wizard casting fire",
        "options": {"wait_for_model": True}
    }

    r = requests.post(model_url, headers=headers, json=payload)

    print(f"Status: {r.status_code}")

    if r.status_code == 200:
        print("✅ Model works on free-tier")
    else:
        print("❌ Error:", r.text)


if __name__ == "__main__":
    check_token()