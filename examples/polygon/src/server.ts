/**
 * Polygon test server — charges USDC on Polygon mainnet.
 *
 * Push mode only: client broadcasts ERC-20 transfer and pays gas.
 * Server verifies the Transfer event on the receipt via RPC.
 * No fee payer, no x402, no ERC-3009.
 *
 * Run: npx tsx examples/polygon/src/server.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Mppx, polygon } from '../../../src/server/index.js'

// Load .env from repo root
const envPath = resolve(import.meta.dirname ?? '.', '../../../.env')
try {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) process.env[match[1]!.trim()] = match[2]!.trim()
  }
} catch {}

const USDC_POLYGON = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'
const RECIPIENT = '0xFd13B3f3f876e100898B72F06A500B5a9E9d1F9C' // from .env PRIVATE_KEY

const mppx = Mppx.create({
  methods: [
    polygon({
      rpcUrl: 'https://rpc-mainnet.matic.quiknode.pro',
      currency: USDC_POLYGON,
      decimals: 6,
    }),
  ],
})

async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)

  if (url.pathname === '/health') {
    return Response.json({ status: 'ok' })
  }

  if (url.pathname === '/api/data') {
    const result = await mppx.charge({
      amount: '0.01', // $0.01 USDC
      currency: USDC_POLYGON,
      decimals: 6,
      recipient: RECIPIENT,
      description: 'Test Polygon payment',
    })(request)

    if (result.status === 402) return result.challenge

    return result.withReceipt(
      Response.json({
        message: 'Payment successful! Here is your premium data.',
        timestamp: new Date().toISOString(),
      }),
    )
  }

  return new Response('Not found', { status: 404 })
}

const port = Number(process.env.PORT) || 4402

const server =
  typeof (globalThis as any).Bun !== 'undefined'
    ? (globalThis as any).Bun.serve({ port, fetch: handler })
    : await startNodeServer(port, handler)

console.log(`\n  Polygon mppx server running on http://localhost:${port}`)
console.log(`  Health: http://localhost:${port}/health`)
console.log(`  Paid:   http://localhost:${port}/api/data`)
console.log(`\n  Recipient: ${RECIPIENT}`)
console.log(`  Mode:      push (client pays gas)\n`)

async function startNodeServer(
  port: number,
  handler: (req: Request) => Promise<Response>,
) {
  const { createServer } = await import('node:http')
  const srv = createServer(async (req, res) => {
    const host = req.headers.host ?? `localhost:${port}`
    const url = `http://${host}${req.url}`
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)
    const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined
    const request = new Request(url, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? body : undefined,
    })
    const response = await handler(request)
    res.writeHead(response.status, Object.fromEntries(response.headers.entries()))
    res.end(Buffer.from(await response.arrayBuffer()))
  })
  return new Promise<typeof srv>((resolve) => srv.listen(port, () => resolve(srv)))
}
