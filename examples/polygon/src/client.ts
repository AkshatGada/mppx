/**
 * Polygon test client — pays USDC on Polygon mainnet via push mode.
 *
 * The client broadcasts an ERC-20 transfer, pays gas in MATIC, and
 * sends the transaction hash as proof to the server.
 * No fee payer, no ERC-3009, no x402.
 *
 * Run: npx tsx examples/polygon/src/client.ts
 *
 * Requires PRIVATE_KEY in .env (an account with USDC + MATIC on Polygon mainnet).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Mppx, polygon } from '../../../src/client/index.js'
import { createWalletClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { polygon as polygonChain } from 'viem/chains'

// ─── Load .env from repo root ─────────────────────────────────────────

const envPath = resolve(import.meta.dirname ?? '.', '../../../.env')
try {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) process.env[match[1]!.trim()] = match[2]!.trim()
  }
} catch {}

// ─── Setup wallet ─────────────────────────────────────────────────────

const privateKey = process.env.PRIVATE_KEY
if (!privateKey) {
  console.error('Error: PRIVATE_KEY not found in .env')
  process.exit(1)
}

const account = privateKeyToAccount(`0x${privateKey.replace(/^0x/, '')}`)
console.log(`\n  Wallet: ${account.address}`)

const walletClient = createWalletClient({
  account,
  chain: polygonChain,
  transport: http('https://polygon-rpc.com'),
})

const erc20Abi = parseAbi(['function transfer(address to, uint256 amount) returns (bool)'])

// ─── Create mppx client (push mode) ──────────────────────────────────

const mppx = Mppx.create({
  methods: [
    polygon({
      sendTransaction: async ({ amount, currency, recipient }) => {
        console.log(`  Broadcasting ERC-20 transfer: ${amount} of ${currency} → ${recipient}`)
        const hash = await walletClient.writeContract({
          address: currency,
          abi: erc20Abi,
          functionName: 'transfer',
          args: [recipient, BigInt(amount)],
        })
        console.log(`  Tx hash: ${hash}`)
        return hash
      },
    }),
  ],
})

// ─── Make a paid request ──────────────────────────────────────────────

const serverUrl = process.env.SERVER_URL || 'http://localhost:4402'

console.log(`  Server: ${serverUrl}`)
console.log(`  Mode:   push (client pays gas in MATIC)\n`)

try {
  console.log('  Requesting /api/data ...')
  const response = await mppx.fetch(`${serverUrl}/api/data`)

  console.log(`  Status: ${response.status}`)

  if (response.ok) {
    const data = await response.json()
    console.log('  Response:', JSON.stringify(data, null, 2))
    const receipt = response.headers.get('Payment-Receipt')
    if (receipt) console.log(`  Receipt: ${receipt.slice(0, 60)}...`)
  } else {
    console.error(`  Error: ${await response.text()}`)
  }
} catch (err) {
  console.error('  Failed:', err)
}

console.log()
