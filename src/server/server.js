import { createServer } from "node:http";
import 'dotenv/config';

const PORT = Number(process.env.PORT ?? 3000);
const rpcUrl = process.env.ETHEREUM_RPC_URL

// USDC on Ethereum mainnet. symbol() and totalSupply() are public view calls.
const TOKEN_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const ABI = {
  symbol: "0x95d89b41",
  totalSupply: "0x18160ddd",
};

async function ethCall(data) {
    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_call",
          params: [{ to: TOKEN_ADDRESS, data }, "latest"],
        }),
        signal: AbortSignal.timeout(12_000),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (payload.error) throw new Error(payload.error.message ?? "RPC call failed");
      if (!payload.result || payload.result === "0x") throw new Error("RPC returned empty contract data");
      return payload.result;
    } catch (error) {
        throw new Error(`All Ethereum RPC providers failed (${`${new URL(rpcUrl).host}: ${error.message}`})`);
    }
}

function decodeString(hex) {
  const bytes = Buffer.from(hex.slice(2), "hex");
  // ERC-20 symbol is commonly encoded as a dynamic string. Also accept
  // legacy bytes32 symbols used by some older tokens.
  if (bytes.length === 32) return bytes.toString("utf8").replace(/\0+$/, "");
  const offset = Number(BigInt(`0x${bytes.subarray(0, 32).toString("hex")}`));
  const length = Number(BigInt(`0x${bytes.subarray(offset, offset + 32).toString("hex")}`));
  return bytes.subarray(offset + 32, offset + 32 + length).toString("utf8");
}

async function getUsdcInfo() {
  const [symbolResult, supplyResult] = await Promise.all([
    ethCall(ABI.symbol),
    ethCall(ABI.totalSupply),
  ]);
  const rawSupply = BigInt(supplyResult);
  const decimals = 6;
  const divisor = 10n ** BigInt(decimals);
  const totalSupply = `${rawSupply / divisor}.${(rawSupply % divisor)
    .toString()
    .padStart(decimals, "0")}`;

  return {
    network: "Ethereum mainnet",
    contract: TOKEN_ADDRESS,
    symbol: decodeString(symbolResult),
    decimals,
    totalSupply,
    source: "eth_call (latest block)",
    fetchedAt: new Date().toISOString(),
  };
}

const server = createServer(async (request, response) => {
  if (request.method !== "GET" || request.url !== "/AshishApiTest") {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Use GET /AshishApiTest" }));
    return;
  }

  try {
    const data = await getUsdcInfo();
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Blockchain API request failed:", error.message);
    response.writeHead(502, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Could not fetch contract data", details: error.message }));
  }
});

server.listen(PORT, () => {
  console.log(`Blockchain API listening at http://localhost:${PORT}`);
  console.log(`Read contract data with GET http://localhost:${PORT}/AshishApiTest`);
});
