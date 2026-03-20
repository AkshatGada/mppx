/**
 * Polygon Client — Pays USDC on Polygon mainnet to access a paid API route.
 *
 * Push mode: client broadcasts an ERC-20 transfer, pays gas in MATIC,
 * and sends the transaction hash as proof to the server.
 * No fee payer, no ERC-3009, no x402 — pure MPP extension.
 */
import { Mppx, polygon } from 'mppx/client'
import { createWalletClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { polygon as polygonChain } from 'viem/chains'

const account = privateKeyToAccount('0x...' as `0x${string}`)

const walletClient = createWalletClient({
  account,
  chain: polygonChain,
  transport: http('https://rpc.ankr.com/polygon'),
})

const erc20Abi = parseAbi(['function transfer(address to, uint256 amount) returns (bool)'])

const mppx = Mppx.create({
  methods: [
    polygon({
      sendTransaction: async ({ amount, currency, recipient }) => {
        // Broadcast ERC-20 transfer — client pays gas in MATIC
        return await walletClient.writeContract({
          address: currency,
          abi: erc20Abi,
          functionName: 'transfer',
          args: [recipient, BigInt(amount)],
        })
      },
    }),
  ],
})

const response = await mppx.fetch('https://api.example.com/api/data')
const data = await response.json()
console.log(data)
// => { data: 'your premium content here' }
