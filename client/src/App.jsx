import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import gameAbi from "./abi.json";
import marketAbi from "./marketAbi.json";
import "./App.css";

// --- ⚠️ PASTE YOUR NEW ADDRESSES HERE ---
const GAME_ADDRESS = "0xb2fe60515dDeD9Ad2bEC78dC87D0274879853FD3";
const MARKET_ADDRESS = "0x95e938152166aB0998c635E096ef16f055cCdb0A";

function App() {
  // --- 1. STATE VARIABLES ---
  // Web3 State
  const [account, setAccount] = useState(null);
  const [gameContract, setGameContract] = useState(null);
  const [marketContract, setMarketContract] = useState(null);

  // Game State
  const [myHeroes, setMyHeroes] = useState([]); // List of all heroes I own
  const [selectedHero, setSelectedHero] = useState(null); // The specific hero I am playing right now
  const [loading, setLoading] = useState(false);
  const [inputAction, setInputAction] = useState("");

  // Market State
  const [activeTab, setActiveTab] = useState("game"); // 'game' or 'market'
  const [listings, setListings] = useState([]); // Heroes for sale
  const [sellPrice, setSellPrice] = useState(""); // Input for selling
  const [heroName, setHeroName] = useState("");
  const [activityLog, setActivityLog] = useState([]);
  // Add this state variable to track the player's input
  const [action, setAction] = useState("");
  // --- 2. CONNECT & SETUP ---
  const fetchAdventureHistory = async (heroId) => {
    if (!gameContract || !heroId) return;

    try {
      // 1. Fetch USER Actions ("I hit the goblin")
      const userFilter = gameContract.filters.AdventureRequested(heroId);
      const userEvents = await gameContract.queryFilter(userFilter);

      // 2. Fetch AI Outcomes ("The goblin dies")
      const aiFilter = gameContract.filters.AdventureResolved(heroId);
      const aiEvents = await gameContract.queryFilter(aiFilter);

      // 3. Format USER logs
      const formattedUser = userEvents.map((e) => ({
        type: "user",
        text: e.args[1], // The Action String
        block: e.blockNumber,
        id: e.transactionHash, // unique key
      }));

      // 4. Format AI logs
      const formattedAI = aiEvents.map((e) => ({
        type: "ai",
        text: e.args[1], // The Story Outcome
        xp: e.args[2].toString(), // XP Gained
        block: e.blockNumber,
        id: e.transactionHash,
      }));

      // 5. MERGE & SORT (Oldest to Newest)
      const combinedLog = [...formattedUser, ...formattedAI].sort(
        (a, b) => a.block - b.block
      );

      // 6. Reverse so newest is at the top (for the UI)
      setActivityLog(combinedLog.reverse());
    } catch (error) {
      console.error("History Error:", error);
    }
  };

  const handleAdventure = async () => {
    if (!gameContract || !selectedHero) return;
    if (!action.trim()) {
      alert("You must do something!");
      return;
    }

    setLoading(true);
    try {
      // Use the 'action' variable here
      const tx = await gameContract.requestAdventure(selectedHero.id, action);
      await tx.wait();

      setAction(""); // Clear the box after sending
      // ... fetch history logic ...
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Please install MetaMask!");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);

      // Initialize Contracts
      const game = new ethers.Contract(GAME_ADDRESS, gameAbi, signer);
      const market = new ethers.Contract(MARKET_ADDRESS, marketAbi, signer);

      setGameContract(game);
      setMarketContract(market);

      console.log("✅ Contracts Loaded");

      // Load Initial Data
      await fetchMyHeroes(game, address);
      await fetchMarketItems(market, game);
    } catch (err) {
      console.error("Connection Error:", err);
    }
  };

  // --- 3. DATA FETCHING ---

  // Fetch ALL Heroes owned by the user
  const fetchMyHeroes = async (game, userAddress) => {
    try {
      // 1. Get array of IDs from Smart Contract
      const tokenIds = await game.getHeroes(userAddress);

      const loadedHeroes = [];

      // 2. Loop through and fetch details for each ID
      for (let i = 0; i < tokenIds.length; i++) {
        const id = tokenIds[i];
        const data = await game.characters(id);

        loadedHeroes.push({
          id: id.toString(),
          name: data[0],
          xp: data[1].toString(),
          story: data[2],
          ipfs: data[3],
        });
      }
      setMyHeroes(loadedHeroes);

      // Refresh the selected hero if it exists
      if (selectedHero) {
        const updated = loadedHeroes.find((h) => h.id === selectedHero.id);
        if (updated) setSelectedHero(updated);
      }
    } catch (err) {
      console.error("Error fetching heroes:", err);
    }
  };

  // Fetch Bazaar Items (Scanning IDs 1-10 for demo)
  // Fetch Bazaar Items
  const fetchMarketItems = async (market, game) => {
    const items = [];
    for (let i = 1; i <= 10; i++) {
      try {
        const listing = await market.listings(i);
        if (listing.active) {
          const charData = await game.characters(i);

          // 👇 ADD THE STORY FIELD HERE
          items.push({
            tokenId: i,
            seller: listing.seller,
            price: ethers.formatEther(listing.price),
            name: charData[0],
            xp: charData[1].toString(),
            story: charData[2], // <--- THIS LINE WAS MISSING
            ipfs: charData[3],
          });
        }
      } catch (e) {
        /* Ignore */
      }
    }
    setListings(items);
  };

  // --- 4. GAMEPLAY ACTIONS ---

  const createCharacter = async () => {
    if (!gameContract) return;

    // Validate Input
    if (!heroName.trim()) {
      alert("Please enter a name for your hero!");
      return;
    }

    setLoading(true);
    try {
      // ✅ Use the state variable 'heroName'
      const tx = await gameContract.createCharacter(heroName);

      await tx.wait();

      // Cleanup
      setHeroName("");
      await fetchMyHeroes(gameContract, account);
    } catch (error) {
      console.error("Creation failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerAction = async () => {
    // DEBUG LOGS
    console.log("🖱️ Act Button Clicked");
    console.log("Game Contract:", gameContract);
    console.log("Selected Hero:", selectedHero);
    console.log("Input:", inputAction);

    // 1. Check Connections
    if (!gameContract) return alert("❌ Error: Game Contract not loaded.");
    if (!selectedHero) return alert("❌ Error: No Hero selected.");
    if (!inputAction.trim()) return alert("⚠️ Please type an action first!");

    setLoading(true);
    try {
      // Optimistic Update
      setSelectedHero((prev) => ({
        ...prev,
        story: `You attempt to: "${inputAction}"... (The DM is plotting)`,
      }));

      // 2. Send Transaction
      console.log("🚀 Sending Transaction...");
      const tx = await gameContract.requestAdventure(
        selectedHero.id,
        inputAction
      );
      console.log("⏳ Mining...", tx.hash);
      await tx.wait();
      console.log("✅ Transaction Confirmed!");

      setInputAction("");
    } catch (error) {
      console.error("Adventure failed:", error);
      setLoading(false);
      alert(`Transaction Failed: ${error.message}`);
    }
  };

  // --- 5. MARKET ACTIONS ---

  const handleSell = async () => {
    if (!sellPrice) return alert("Enter a price!");
    if (!gameContract || !marketContract) return alert("Contracts not loaded");
    if (!selectedHero) return;

    setLoading(true);
    try {
      const priceWei = ethers.parseEther(sellPrice);

      console.log("1. Approving Market...");
      const tx1 = await gameContract.approve(MARKET_ADDRESS, selectedHero.id);
      await tx1.wait();

      console.log("2. Listing Item...");
      const tx2 = await marketContract.listHero(selectedHero.id, priceWei);
      await tx2.wait();

      alert("Hero listed for sale!");

      // Cleanup: Deselect hero and refresh lists
      setSelectedHero(null);
      setActiveTab("market");
      await fetchMyHeroes(gameContract, account);
      await fetchMarketItems(marketContract, gameContract);
    } catch (err) {
      console.error("Sell Error:", err);
      alert("Error selling (Check console)");
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (tokenId, priceEth) => {
    setLoading(true);
    try {
      const priceWei = ethers.parseEther(priceEth);
      const tx = await marketContract.buyHero(tokenId, { value: priceWei });
      await tx.wait();

      alert("Hero Bought! Welcome back.");
      await fetchMyHeroes(gameContract, account);
      await fetchMarketItems(marketContract, gameContract);
      setActiveTab("game");
    } catch (err) {
      console.error("Buy Error:", err);
      alert("Error buying");
    } finally {
      setLoading(false);
    }
  };

  // --- 6. EVENT LISTENERS ---
  // --- 6. EVENT LISTENERS (ROBUST VERSION) ---
  useEffect(() => {
    if (!gameContract) return;

    const onAdventureResolved = async (
      tokenId,
      outcome,
      xpGained,
      imageURI
    ) => {
      console.log("🔔 EVENT RECEIVED:", {
        tokenId,
        outcome,
        xpGained,
        imageURI,
      });

      // Convert everything to string to be safe
      const eventId = tokenId.toString();
      const currentId = selectedHero?.id?.toString();

      // Update if it matches OR if we just want to refresh data generally
      if (selectedHero && eventId === currentId) {
        console.log("✅ Updating UI for Hero:", eventId);

        setSelectedHero((prev) => ({
          ...prev,
          story: outcome,
          xp: xpGained.toString(), // Ensure XP is string
          ipfs: imageURI,
        }));

        setLoading(false);
      }

      // Always refresh the full roster
      await fetchMyHeroes(gameContract, account);
    };

    gameContract.on("AdventureResolved", onAdventureResolved);
    return () => {
      gameContract.off("AdventureResolved", onAdventureResolved);
    };
  }, [gameContract, selectedHero, account]); // Dependencies

  useEffect(() => {
    connectWallet();
  }, []);

  // Helper to check status
  const isGameOver = selectedHero?.story?.includes("[GAME OVER]");
  const isVictory = selectedHero?.story?.includes("[VICTORY]");
  const isGameEnded = isGameOver || isVictory;

  // --- 7. RENDER HELPERS ---

  const renderImage = (ipfsLink) => {
    // 1. Placeholder
    if (!ipfsLink || ipfsLink === "") {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            background: "#0f0f0f",
            color: "#333",
            border: "1px dashed #333",
          }}
        >
          <span style={{ fontSize: "2rem" }}>⚔️</span>
          <span style={{ fontSize: "0.7rem", marginTop: "5px" }}>No Image</span>
        </div>
      );
    }

    // 2. Clean the CID
    const cid = ipfsLink.replace("ipfs://", "");

    // 3. Gateway List (Pinata First)
    const gateways = [
      "https://gateway.pinata.cloud/ipfs/", // Best match for Pinata uploads
      "https://ipfs.io/ipfs/",
      "https://dweb.link/ipfs/",
      "https://4everland.io/ipfs/",
    ];

    return (
      <img
        src={`${gateways[0]}${cid}`}
        alt="Hero"
        className="game-image"
        key={cid}
        data-index={0}
        onError={(e) => {
          let currentIndex = parseInt(
            e.target.getAttribute("data-index") || "0"
          );
          let nextIndex = currentIndex + 1;

          if (nextIndex < gateways.length) {
            console.log(
              `Gateway ${currentIndex} failed. Switching to ${gateways[nextIndex]}...`
            );
            e.target.setAttribute("data-index", nextIndex);
            e.target.src = `${gateways[nextIndex]}${cid}`;
          } else {
            e.target.style.display = "none";
            e.target.parentNode.innerHTML =
              "<span style='color:red; font-size:0.8rem'>❌ Image Blocked</span>";
          }
        }}
      />
    );
  };
  // --- 8. MAIN UI RENDER ---
  return (
    <div className="container">
      <div className="header">
        <h1>NEXUS QUEST</h1>

        {/* NAV TABS */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "15px",
            marginTop: "20px",
          }}
        >
          <button
            className={`btn ${activeTab === "game" ? "btn-primary" : ""}`}
            style={{
              background: activeTab !== "game" ? "rgba(255,255,255,0.05)" : "",
            }}
            onClick={() => setActiveTab("game")}
          >
            My Heroes
          </button>
          <button
            className={`btn ${activeTab === "market" ? "btn-primary" : ""}`}
            style={{
              background:
                activeTab !== "market" ? "rgba(255,255,255,0.05)" : "",
            }}
            onClick={() => setActiveTab("market")}
          >
            Bazaar
          </button>
        </div>
      </div>

      {/* --- GAME TAB --- */}
      {activeTab === "game" && (
        <div className="game-view">
          {!account ? (
            <div className="connect-box">
              <button className="btn btn-primary" onClick={connectWallet}>
                Connect Wallet
              </button>
            </div>
          ) : (
            <div>
              {/* A. HERO ROSTER (Visible when NO hero is selected) */}
              {!selectedHero ? (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "20px",
                    }}
                  >
                    <h2 style={{ margin: 0, color: "#888" }}>
                      My Roster ({myHeroes.length})
                    </h2>
                    <input
                      type="text"
                      placeholder="Hero Name..."
                      value={heroName}
                      onChange={(e) => setHeroName(e.target.value)}
                      style={{
                        padding: "8px 12px",
                        fontSize: "0.9rem",
                        borderRadius: "4px",
                        border: "1px solid #444",
                        background: "#222",
                        color: "white",
                        outline: "none",
                      }}
                    />
                    <button
                      className="btn"
                      style={{ padding: "8px 20px", fontSize: "0.9rem" }}
                      onClick={createCharacter}
                      disabled={loading}
                    >
                      {loading ? "..." : "+ Summon New"}
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "15px",
                      justifyContent: "center",
                    }}
                  >
                    {myHeroes.length === 0 && (
                      <p style={{ color: "#666", marginTop: "50px" }}>
                        No heroes yet.
                      </p>
                    )}

                    {myHeroes.map((hero) => (
                      <div
                        key={hero.id}
                        className="game-card"
                        style={{
                          width: "200px",
                          cursor: "pointer",
                          margin: 0,
                          transition: "transform 0.2s",
                        }}
                        onClick={async () => {
                          setSelectedHero(hero);
                          // Update UI before the async operation

                          try {
                            await fetchAdventureHistory(hero.id); // Wait for the async task
                            setSelectedHero(hero); // Update state after it finishes
                          } catch (error) {
                            console.error(error);
                          } finally {
                            setLoading(false); // Clean up (e.g., stop spinner)
                          }
                        }}
                      >
                        {/* --- SAFE STORY DISPLAY --- */}
                        {selectedHero && selectedHero.story && (
                          <div
                            style={{
                              background:
                                "linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0.9))",
                              padding: "15px",
                              borderRadius: "8px",
                              marginTop: "-60px",
                              position: "relative",
                              borderTop: "1px solid #444",
                              pointerEvents: "none", // Lets clicks pass through to the image if needed
                            }}
                          >
                            {/* Narrative Part (Grey) */}
                            <p
                              style={{
                                color: "#ccc",
                                margin: 0,
                                fontSize: "0.9rem",
                                lineHeight: "1.4",
                              }}
                            >
                              {selectedHero.story.split("?")[0]}
                              {selectedHero.story.includes("?") ? "." : ""}
                            </p>

                            {/* The "Intrusive" Question (Gold Pulse) */}
                            {selectedHero.story.includes("?") && (
                              <div
                                style={{
                                  marginTop: "10px",
                                  color: "#ffb700",
                                  fontWeight: "bold",
                                  fontSize: "1rem",
                                  textAlign: "center",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                  animation: "pulseText 2s infinite",
                                }}
                              >
                                ⚠️{" "}
                                {selectedHero.story
                                  .split("?")
                                  .slice(-2)[0]
                                  .split(".")
                                  .pop()}
                                ?
                              </div>
                            )}
                          </div>
                        )}
                        <div
                          className="hero-header"
                          style={{ fontSize: "0.9rem" }}
                        >
                          {hero.name}{" "}
                          <span style={{ color: "#666" }}>#{hero.id}</span>
                        </div>
                        <div
                          className="image-frame"
                          style={{ height: "150px" }}
                        >
                          {renderImage(hero.ipfs)}
                        </div>
                        <div
                          style={{
                            textAlign: "center",
                            padding: "10px",
                            color: "#ffb700",
                            fontSize: "0.8rem",
                          }}
                        >
                          PLAY ►
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* B. ACTIVE GAMEPLAY (Visible when Hero IS selected) */
                <div>
                  <button
                    onClick={() => setSelectedHero(null)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#aaa",
                      cursor: "pointer",
                      marginBottom: "10px",
                      fontSize: "1rem",
                    }}
                  >
                    ← Back to Roster
                  </button>

                  <div className="game-card">
                    <div className="hero-header">
                      <div className="hero-name">
                        {selectedHero.name}{" "}
                        <span style={{ fontSize: "0.5em", color: "#555" }}>
                          #{selectedHero.id}
                        </span>
                      </div>
                      <div className="xp-badge">✨ {selectedHero.xp} XP</div>
                    </div>

                    <div className="image-frame">
                      {loading ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                            color: "#ffb700",
                          }}
                        >
                          🔮 Fate is deciding...
                        </div>
                      ) : (
                        renderImage(selectedHero.ipfs) || (
                          <p
                            style={{
                              textAlign: "center",
                              paddingTop: "180px",
                              color: "#555",
                            }}
                          >
                            Ready.
                          </p>
                        )
                      )}
                    </div>

                    <div className="story-box">"{selectedHero.story}"</div>
                    {/* Add this inside the Game View, perhaps near the Story Box */}
                    <button
                      className="btn"
                      style={{
                        marginTop: "10px",
                        fontSize: "0.8rem",
                        background: "#333",
                      }}
                      onClick={async () => {
                        setLoading(true);
                        await fetchMyHeroes(gameContract, account);
                        setLoading(false);
                      }}
                    >
                      🔄 Force Refresh Data
                    </button>

                    {/* ACTIONS */}
                    <div className="controls">
                      <input
                        type="text"
                        placeholder={
                          isGameEnded
                            ? "This tale has ended."
                            : "What do you do?"
                        }
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                        disabled={isGameEnded || loading} // 🔒 LOCK INPUT
                        style={{
                          // Optional: Grey it out if dead
                          opacity: isGameEnded ? 0.5 : 1,
                          cursor: isGameEnded ? "not-allowed" : "text",
                        }}
                      />

                      <button
                        className="btn"
                        onClick={handleAdventure}
                        disabled={isGameEnded || loading} // 🔒 LOCK BUTTON
                      >
                        {isGameOver
                          ? "💀 R.I.P"
                          : isVictory
                          ? "🏆 KING"
                          : "Action"}
                      </button>
                    </div>
                    {/* --- QUEST JOURNAL SECTION --- */}
                    {/* 👇 PASTE THIS UPDATED QUEST JOURNAL 👇 */}

                    <div
                      style={{
                        marginTop: "30px",
                        borderTop: "1px solid #333",
                        paddingTop: "20px",
                      }}
                    >
                      <h4
                        style={{
                          color: "#888",
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          fontSize: "0.8rem",
                        }}
                      >
                        📜 Adventure Log
                      </h4>

                      <div
                        style={{
                          height: "300px", // Fixed height
                          overflowY: "auto",
                          background: "rgba(0,0,0,0.4)",
                          borderRadius: "8px",
                          padding: "15px",
                          marginTop: "10px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        {activityLog.length === 0 ? (
                          <p
                            style={{
                              color: "#555",
                              textAlign: "center",
                              fontStyle: "italic",
                            }}
                          >
                            A blank page awaits your legend...
                          </p>
                        ) : (
                          activityLog.map((log) => (
                            <div
                              key={log.id}
                              style={{
                                alignSelf:
                                  log.type === "user"
                                    ? "flex-end"
                                    : "flex-start",
                                maxWidth: "80%",
                                textAlign:
                                  log.type === "user" ? "right" : "left",
                              }}
                            >
                              {/* The Bubble */}
                              <div
                                style={{
                                  background:
                                    log.type === "user" ? "#333" : "#1a1a1a",
                                  border:
                                    log.type === "user"
                                      ? "1px solid #555"
                                      : "1px solid #ffb700",
                                  color: log.type === "user" ? "#aaa" : "#fff",
                                  padding: "8px 12px",
                                  borderRadius: "8px",
                                  display: "inline-block",
                                  fontSize: "0.85rem",
                                }}
                              >
                                {log.type === "user" && (
                                  <span
                                    style={{
                                      fontSize: "0.7rem",
                                      color: "#666",
                                      display: "block",
                                    }}
                                  >
                                    YOU
                                  </span>
                                )}
                                {log.type === "ai" && (
                                  <span
                                    style={{
                                      fontSize: "0.7rem",
                                      color: "#ffb700",
                                      display: "block",
                                    }}
                                  >
                                    GAME MASTER
                                  </span>
                                )}

                                {log.text}

                                {/* Show XP only for AI messages */}
                                {log.type === "ai" && log.xp > 0 && (
                                  <div
                                    style={{
                                      marginTop: "5px",
                                      color: "#ffb700",
                                      fontWeight: "bold",
                                      fontSize: "0.75rem",
                                    }}
                                  >
                                    ✨ +{log.xp} XP
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    {/* SELL AREA */}
                    <div
                      style={{
                        marginTop: "30px",
                        borderTop: "1px solid #333",
                        paddingTop: "20px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          alignItems: "center",
                        }}
                      >
                        <input
                          type="number"
                          placeholder="ETH Price"
                          className="action-input"
                          style={{ width: "100px" }}
                          value={sellPrice}
                          onChange={(e) => setSellPrice(e.target.value)}
                        />
                        <button
                          className="btn"
                          style={{
                            background: "#d63031",
                            color: "white",
                            flex: 1,
                          }}
                          onClick={handleSell}
                          disabled={loading}
                        >
                          Sell Hero
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- MARKET TAB --- */}
      {/* --- MARKET TAB (Grid View) --- */}
      {/* --- MARKET TAB (Grid View with Story & XP) --- */}
      {activeTab === "market" && (
        <div className="market-view">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "30px",
              padding: "0 20px",
            }}
          >
            <h2 style={{ margin: 0, color: "#888" }}>Active Listings</h2>
            <span style={{ fontSize: "0.9rem", color: "#555" }}>
              Refresh to see new items
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "20px",
              justifyContent: "center",
            }}
          >
            {listings.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  marginTop: "50px",
                  color: "#666",
                }}
              >
                <p style={{ fontSize: "2rem" }}>🕸️</p>
                <p>The bazaar is empty.</p>
              </div>
            )}

            {listings.map((item) => (
              <div
                key={item.tokenId}
                className="game-card"
                style={{
                  width: "240px",
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  background: "#1a1a1a",
                  border: "1px solid #333",
                }}
              >
                {/* 1. Header: Name & Price */}
                <div
                  className="hero-header"
                  style={{
                    fontSize: "0.9rem",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #333",
                    paddingBottom: "8px",
                  }}
                >
                  <span
                    style={{
                      fontWeight: "bold",
                      color: "#fff",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "120px",
                    }}
                  >
                    {item.name}
                  </span>
                  <div
                    style={{
                      color: "#4ade80",
                      fontWeight: "bold",
                      background: "rgba(74, 222, 128, 0.1)",
                      padding: "2px 8px",
                      borderRadius: "4px",
                    }}
                  >
                    Ξ {item.price}
                  </div>
                </div>

                {/* 2. Image Area */}
                <div
                  className="image-frame"
                  style={{
                    height: "160px",
                    margin: "10px 0",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  {renderImage(item.ipfs)}
                </div>

                {/* 3. Story Preview (New) */}
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#aaa",
                    fontStyle: "italic",
                    height: "40px",
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: "2",
                    WebkitBoxOrient: "vertical",
                    marginBottom: "10px",
                    padding: "0 5px",
                  }}
                >
                  "{item.story || "No history written yet..."}"
                </div>

                {/* 4. Stats: XP & Seller */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "#111",
                    padding: "5px 8px",
                    borderRadius: "4px",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      color: "#ffb700",
                      fontSize: "0.8rem",
                      fontWeight: "bold",
                    }}
                  >
                    ✨ {item.xp} XP
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#666" }}>
                    Seller: {item.seller.slice(0, 4)}...{item.seller.slice(-4)}
                  </div>
                </div>

                {/* 5. Action Button */}
                <div style={{ marginTop: "auto" }}>
                  {item.seller.toLowerCase() !== account.toLowerCase() ? (
                    <button
                      className="btn btn-primary"
                      style={{
                        width: "100%",
                        fontSize: "0.9rem",
                        padding: "10px",
                      }}
                      onClick={() => handleBuy(item.tokenId, item.price)}
                      disabled={loading}
                    >
                      {loading ? "..." : "Buy Now"}
                    </button>
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        color: "#ffb700",
                        fontSize: "0.8rem",
                        border: "1px dashed #ffb700",
                        padding: "8px",
                        borderRadius: "5px",
                        background: "rgba(255, 183, 0, 0.05)",
                      }}
                    >
                      Your Listing
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
