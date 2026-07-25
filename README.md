<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/65547cfb-d53a-4320-a669-bd0ff2033198

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Ethereum Sepolia integration

Nyay Setu can seal officer decisions through the `KisanNyayLedger` smart contract in
`contracts/KisanNyayLedger.sol`. When Sepolia is not configured, the application keeps
working with its local cryptographic ledger simulator.

1. Add `SEPOLIA_RPC_URL` and `PRIVATE_KEY` to `.env.local`.
2. Compile the contract:
   `npm run blockchain:compile`
3. Deploy to Sepolia:
   `npm run blockchain:deploy:sepolia`
4. Copy the deployed address into `.env.local` as `CONTRACT_ADDRESS`.

Never commit `.env.local`, a wallet private key, or a seed phrase. Use a dedicated
testnet wallet with Sepolia ETH only.

The backend exposes `/api/blockchain/status` so the application can report whether it
is using Ethereum Sepolia or the local simulator. Confirmed Sepolia decisions include
an Etherscan transaction link in the claim timeline and ledger explorer.
