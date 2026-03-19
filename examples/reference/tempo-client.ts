/**
 * Tempo Client — Pays USDC (pathUSD) on Tempo to access a paid API route.
 *
 * The client intercepts 402 responses, constructs and signs an on-chain
 * token transfer, and retries with the credential — all handled by the SDK.
 */
import { Mppx, tempo } from 'mppx/client'
import { privateKeyToAccount } from 'viem/accounts'

const account = privateKeyToAccount('0x...' as `0x${string}`)

const mppx = Mppx.create({
  methods: [
    // Tempo handles everything: builds the ERC-20 transfer call,
    // signs it, broadcasts it, and sends the tx hash as credential.
    tempo({
      account,
      // 'push' = client broadcasts tx, sends hash (default for JSON-RPC accounts)
      // 'pull' = client signs tx, server broadcasts (default for local accounts)
      mode: 'push',
    }),
  ],
})

// mppx.fetch works like normal fetch — if the server returns 402,
// it automatically pays and retries.
const response = await mppx.fetch('https://api.example.com/api/data')
const data = await response.json()
console.log(data)
// => { data: 'your premium content here' }
