# Polygon Example

End-to-end demo of a payment-gated API endpoint using the `polygon` method.

The client pays **$0.01 USDC** on Polygon mainnet to access `/api/data`. It broadcasts an ERC-20 `transfer` on-chain, waits for confirmation, and sends the transaction hash as proof. The server fetches the receipt and verifies the Transfer event before responding.

## Prerequisites

- Node.js 20+
- A Polygon mainnet wallet with USDC and MATIC (for gas)

USDC on Polygon: [`0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`](https://polygonscan.com/token/0x3c499c542cef5e3811e1192ce70d8cc03d5c3359)

## Setup

Create a `.env` file in the repo root (one already exists if you followed the main setup):

```
PRIVATE_KEY=your_wallet_private_key_without_0x_prefix
MPP_SECRET_KEY=any_random_32_byte_hex_string
```

Generate a secret key if you need one:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Run the demo

Open two terminals from the repo root.

**Terminal 1 — start the server:**

```bash
npx tsx examples/polygon/src/server.ts
```

Output:
```
  Polygon mppx server running on http://localhost:4402
  Health: http://localhost:4402/health
  Paid:   http://localhost:4402/api/data

  Recipient: 0x...
  Mode:      push (client pays gas)
```

**Terminal 2 — run the client:**

```bash
npx tsx examples/polygon/src/client.ts
```

Output:
```
  Wallet: 0x...
  Server: http://localhost:4402
  Mode:   push (client pays gas in MATIC)

  Requesting /api/data ...
  Broadcasting ERC-20 transfer: 10000 of 0x3c499c... → 0x...
  Tx hash: 0x...
  Waiting for confirmation...
  Confirmed ✓
  Status: 200
  Response: {
    "message": "Payment successful! Here is your premium data.",
    "timestamp": "..."
  }
  Receipt: eyJ...
```

## What happens

```
Client                              Server
  │                                   │
  │──── GET /api/data ──────────────→ │
  │                                   │  No Authorization header
  │ ←── 402 + WWW-Authenticate ───── │  Challenge: amount=10000, currency=USDC, recipient=0x...
  │                                   │
  │  [broadcasts ERC-20 transfer]     │
  │  [waits for on-chain confirmation]│
  │                                   │
  │──── GET /api/data ──────────────→ │  Authorization: mpp polygon charge <credential>
  │                                   │  [fetches tx receipt from Polygon RPC]
  │                                   │  [finds matching Transfer event log]
  │ ←── 200 + Payment-Receipt ──────  │
```

## Customise

Edit [`src/server.ts`](src/server.ts) to change:
- `amount` — payment required (e.g. `'1'` for $1.00 USDC)
- `RECIPIENT` — address that receives the USDC
- `currency` — any ERC-20 token on Polygon

Edit [`src/client.ts`](src/client.ts) to use a different RPC or wallet setup.
