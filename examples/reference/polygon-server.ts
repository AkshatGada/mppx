/**
 * Polygon Server — Charges USDC on Polygon mainnet for a specific API route.
 *
 * Push mode only: client broadcasts the ERC-20 transfer and pays gas.
 * Server verifies the Transfer event in the on-chain receipt.
 * No fee payer, no x402, no ERC-3009 — pure MPP extension.
 */
import { Mppx, polygon } from 'mppx/server'

const USDC_POLYGON = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'
const RECIPIENT = '0xYourWalletAddress'

const mppx = Mppx.create({
  methods: [
    polygon({
      rpcUrl: 'https://polygon-rpc.com',
      currency: USDC_POLYGON,
      decimals: 6,
    }),
  ],
  realm: 'api.example.com',
  secretKey: process.env.SECRET_KEY!,
})

export async function handler(request: Request): Promise<Response | null> {
  const url = new URL(request.url)

  if (url.pathname === '/api/health') {
    return Response.json({ status: 'ok' })
  }

  // Paid route — $1 USDC on Polygon
  // Client receives the challenge, broadcasts an ERC-20 transfer, and
  // retries with the transaction hash in the Authorization header.
  if (url.pathname === '/api/data') {
    const result = await mppx.charge({
      amount: '1',
      currency: USDC_POLYGON,
      decimals: 6,
      recipient: RECIPIENT,
      description: 'Premium API data',
    })(request)

    if (result.status === 402) return result.challenge

    // Server verified the Transfer event in the client's on-chain receipt.
    return result.withReceipt(Response.json({ data: 'your premium content here' }))
  }

  return null
}
