# NexusQuest

A Web3-powered gaming and marketplace platform built with Solidity smart contracts, React frontend, and IPFS integration.

## Overview

NexusQuest is a decentralized gaming ecosystem that combines NFTs, smart contracts, and AI integration for an immersive gaming experience. The project includes:

- **Smart Contracts**: ERC-721 based NFT system (NexusQuest) and a marketplace for trading assets
- **Frontend**: React application built with Vite for interacting with smart contracts
- **Backend Integration**: IPFS/Pinata for decentralized storage, Hugging Face AI, and Gemini API integration
- **Game Logic**: Python-based game master logic for game state management

## Tech Stack

- **Blockchain**: Ethereum (Solidity, Hardhat)
- **Frontend**: React, Vite, ethers.js
- **Storage**: IPFS, Pinata
- **AI/ML**: Hugging Face API, Google Gemini API
- **Smart Contract Standards**: OpenZeppelin (ERC-721, Ownable, ReentrancyGuard)

## Prerequisites

- Node.js (v16 or higher)
- Python 3.8+
- Ganache (for local development) or access to an Ethereum test network
- Private key for deployment

## Installation

### 1. Clone and Install Dependencies

```bash
# Install root-level dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 2. Environment Configuration

Copy the `.env` file and configure:

```env
WEB3_PROVIDER_URI=HTTP://127.0.0.1:8545
PRIVATE_KEY=your_private_key_here
GEMINI_API_KEY=your_gemini_key
HUGGINGFACE_API_KEY=your_hf_key
IPFS_API_URL=http://127.0.0.1:5001/api/v0/add
PINATA_API_KEY=your_pinata_key
PINATA_JWT=your_pinata_jwt
PINATA_API_SECRET=your_pinata_secret
```

### 3. Start Local Blockchain (Optional)

```bash
ganache-cli --deterministic
```

## Project Structure

```
nexus-quest/
├── contracts/                 # Solidity smart contracts
│   ├── NexusQuest.sol        # ERC-721 NFT contract
│   └── Marketplace.sol       # Marketplace contract
├── scripts/                   # Deployment scripts
│   ├── deploy.js             # Deploy NexusQuest contract
│   ├── deploy_market.js      # Deploy Marketplace contract
│   └── deploy-all.js         # Deploy all contracts
├── client/                    # React frontend
│   ├── src/
│   │   ├── App.jsx           # Main application component
│   │   ├── main.jsx          # Entry point
│   │   ├── abi.json          # NexusQuest ABI
│   │   └── marketabi.json    # Marketplace ABI
│   └── vite.config.js        # Vite configuration
├── artifacts/                # Compiled contract artifacts
├── gamemaster.py             # Game logic and state management
├── check-hf.py              # Hugging Face integration check
├── hardhat.config.js         # Hardhat configuration
├── package.json              # Project dependencies
└── .env                       # Environment variables
```

## Smart Contracts

### NexusQuest.sol

ERC-721 based NFT contract that represents in-game assets and collectibles.

**Key Features:**

- Minting and burning of NFTs
- URI storage for metadata
- Ownership management

### Marketplace.sol

Decentralized marketplace for buying and selling NexusQuest NFTs.

**Key Features:**

- List NFTs for sale
- Purchase NFTs
- Manage listings
- Reentrancy protection

## Usage

### Deploy Contracts

```bash
# Deploy all contracts
npx hardhat run scripts/deploy-all.js --network localhost

# Or deploy individually
npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/deploy_market.js --network localhost
```

### Run Frontend

```bash
cd client
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Run Game Logic

```bash
python gamemaster.py
```

### Check Hugging Face Integration

```bash
python check-hf.py
```

## Key Files

- **hardhat.config.js**: Hardhat configuration with network settings
- **package.json**: Project dependencies and scripts
- **.env**: Environment variables (configure before running)
- **check-hf.py**: Validates Hugging Face API connectivity
- **gamemaster.py**: Core game logic and state management

## API Integration

### IPFS/Pinata

Used for storing NFT metadata and assets decentralized storage.

### Hugging Face

Provides AI/ML capabilities for game intelligence and NPC behavior.

### Google Gemini

Powers advanced AI features for dynamic game content.

## Networks

Configured networks in `hardhat.config.js`:

- **localhost**: Local Ganache instance (default)
- **sepolia**: Ethereum Sepolia testnet
- **mainnet**: Ethereum mainnet (for production)

## Common Commands

```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Clean build artifacts
npx hardhat clean

# Verify contract
npx hardhat verify --network <network> <contract_address> <constructor_args>
```

## Development Workflow

1. Modify smart contracts in `contracts/`
2. Compile: `npx hardhat compile`
3. Deploy: `npx hardhat run scripts/deploy-all.js --network localhost`
4. Update ABIs in `client/src/` if needed
5. Run frontend: `cd client && npm run dev`
6. Test interactions in browser

## Troubleshooting

- **Connection refused**: Ensure Ganache is running on the configured RPC URL
- **Invalid private key**: Check `.env` file for correct private key format
- **Missing ABIs**: Regenerate ABIs after contract changes: `npx hardhat compile`
- **IPFS connection**: Verify IPFS daemon is running or Pinata credentials are correct

## License

MIT

## Contributing

Contributions are welcome! Please fork the repository and create a pull request with your changes.

## Support

For issues and questions, please open an issue in the repository.
