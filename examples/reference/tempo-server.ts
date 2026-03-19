/**
 * Tempo Server — Charges USDC (pathUSD) on Tempo for a specific API route.
 *
 * The server issues a 402 challenge when a client hits /api/data without paying.
 * Once the client sends a credential (tx hash or signed tx), the server verifies
 * the on-chain transfer and returns the data with a payment receipt.
 */
import { Mppx, tempo } from 'mppx/server'
import { privateKeyToAccount } from 'viem/accounts'

const account = privateKeyToAccount('0x...' as `0x${string}`)
const currency = '0x20c0000000000000000000000000000000000000' as const // pathUSD

const mppx = Mppx.create({
  methods: [
    tempo({
      currency,
      // Server pays gas on behalf of the client (Tempo-specific feature)
      feePayer: true,
      // Funds go to this address
      recipient: account.address,
      // Set to false / omit for mainnet
      testnet: true,
    }),
  ],
  realm: 'api.example.com',
  secretKey: process.env.SECRET_KEY!,
})

export async function handler(request: Request): Promise<Response | null> {
  const url = new URL(request.url)

  // Free route — no payment needed
  if (url.pathname === '/api/health') {
    return Response.json({ status: 'ok' })
  }

  // Paid route — $0.01 USDC per request
  if (url.pathname === '/api/data') {
    const result = await mppx.charge({
      amount: '0.01',
      description: 'Premium API data',
    })(request)

    // No credential provided → return 402 + WWW-Authenticate challenge
    if (result.status === 402) return result.challenge

    // Payment verified → return data + Payment-Receipt header
    return result.withReceipt(Response.json({ data: 'your premium content here' }))
  }

  return null
}
