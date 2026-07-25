# Nyay Setu AI – Kisan Nyay Ledger

**Live Demo URL**: [https://nyay-setu-ai.onrender.com/landing.html](https://nyay-setu-ai.onrender.com/landing.html)

Nyay Setu AI is a decentralized, AI-powered agricultural crop damage insurance verification portal. It automates and validates insurance claims for farmers using artificial intelligence (Google Gemini Vision API), localized meteorological verification (OpenWeather API), and cryptographically signs decisions onto an immutable ledger using smart contracts deployed on the **Ethereum Sepolia Testnet**.

---

## Key Features

1. **AI Vision Analysis (Google Gemini)**
   * Automatically analyzes uploaded images of crop damage.
   * Verifies if the crop type matches the claim and if the damage matches the reported cause (e.g., lodging from floods, root rot) to prevent fraud.

2. **Parametric Weather Verification (OpenWeather)**
   * Cross-references the coordinate data of the claim with historical meteorological logs to verify if weather anomalies (flood levels, drought temperatures, hailstorms) occurred during the reported date.

3. **Smart Contract Verification (Ethereum Sepolia)**
   * Officer decisions are securely signed on-chain using a Solidity smart contract ([KisanNyayLedger.sol](contracts/KisanNyayLedger.sol)).
   * Payout qualifications and proof of evidence are immutably sealed, ensuring zero tampering by third parties.

4. **Clickable Block Explorer Integration**
   * The DApp dashboard links block proofs directly to **Sepolia Etherscan**, allowing farmers and auditors to verify on-chain states interactively.

---

## Tech Stack
* **Frontend:** React, TypeScript, Tailwind CSS, Leaflet Maps, Lucide Icons.
* **Backend:** Node.js, Express.js.
* **Blockchain:** Solidity, Hardhat, Ethers.js v6.

---

## Prerequisites
Before setting up the project, ensure you have:
* **Node.js** (v18 or higher recommended)
* **MetaMask** Browser Extension (to hold your keys)
* **Sepolia Testnet ETH** (Get free testnet funds from the [Google Cloud Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) or [Infura Faucet](https://www.infura.io/faucet/sepolia))
* A free **Infura** or **Alchemy** API key for the Sepolia network node.

---

## Setup & Installation

Follow these steps to clone, configure, and run the project:

### 1. Clone the Repository
```bash
git clone <your-repo-link>
cd Nyay_Setu_AI
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Compile the Smart Contract
Verify that your Solidity compiler compiles the contract and generates the ABI:
```bash
npx hardhat compile --config hardhat.config.cjs
```

### 4. Configure Environment Variables
Create a file named `.env.local` in the root of the project:
```bash
cp .env.example .env.local
```

Open `.env.local` and configure the following parameters:
```env
GEMINI_API_KEY="your-google-gemini-api-key"
OPENWEATHER_API_KEY="your-openweather-api-key"

# Blockchain Configuration (Sepolia Testnet)
SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/your-infura-api-key"
PRIVATE_KEY="your-metamask-wallet-private-key"
```
> [!IMPORTANT]
> To get your private key in MetaMask: click the three dots next to Account 1 -> **Account Details** -> **Show Private Key** (do not use the 12-word seed phrase).

### 5. Deploy the Smart Contract
Deploy the compiled contract to the Sepolia Testnet:
```bash
npx hardhat run scripts/deploy.cjs --network sepolia --config hardhat.config.cjs
```
This will output a line similar to:
```bash
Deploying KisanNyayLedger...
KisanNyayLedger deployed to: 0x...
```

Copy the generated contract address and add it to `.env.local`:
```env
CONTRACT_ADDRESS="0x_your_deployed_contract_address"
```

---

## Running the Application

Once setup is complete, start the backend server and frontend development client:
```bash
npm run dev
```

* The server will boot up (default port: `8082`).
* Open your browser and navigate to `http://localhost:8082` to interact with the application.
* **Farmer view:** Submit a claim and watch the AI/Weather validation timeline.
* **Officer view:** Approve/Reject claims to write data on-chain. Click on Etherscan links to watch transaction confirmations!

---

## Why Blockchain? (Hackathon Pitch Deck)

* **Zero Corruption & Immutability:** In traditional crop insurance, records can be retroactively altered to deny payouts. On Nyay Setu, once an officer approves a claim, that decision is sealed onto a global ledger. Nobody (not even admins) can change it.
* **Cryptographic Proof of Evidence:** The cryptographic hash of the crop photo + geolocations is stored on-chain. Swapping evidence later is impossible, preventing insurance fraud.
* **Radical Transparency:** Farmers get an Etherscan transaction link providing absolute proof that their claim has been signed.
* **Automated Parametric Insurance:** Having the ledger on-chain prepares the application for version 2, where smart contracts will automatically release stablecoin funds directly to the farmer's wallet immediately when AI + Weather conditions are satisfied, removing manual bureaucracy completely.
