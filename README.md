# Blockchain API test

A minimal Node.js HTTP API that reads public USDC contract data from Ethereum mainnet.

## Run

```sh
npm run dev
```

In another terminal, call the endpoint and print its response:

```sh
npm run demo
```

The endpoint is `GET http://localhost:3000/AshishApiTest`. It returns the USDC symbol and total supply, read from the deployed Ethereum mainnet contract at `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` using `eth_call`.

The default RPC providers are PublicNode and Cloudflare, tried in order. Set `ETHEREUM_RPC_URL` to use a single custom Ethereum JSON-RPC provider, or `PORT` to change the local port. Node.js 18 or newer is required; there are no third-party dependencies.
