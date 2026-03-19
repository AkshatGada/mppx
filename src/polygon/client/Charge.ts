import type { Address } from 'viem'
import type * as Challenge from '../../Challenge.js'
import * as Credential from '../../Credential.js'
import * as Method from '../../Method.js'
import * as z from '../../zod.js'
import * as defaults from '../internal/defaults.js'
import * as Methods from '../Methods.js'

/**
 * Creates a Polygon charge method intent for usage on the client.
 *
 * The client broadcasts an ERC-20 `transfer` on Polygon, pays gas in MATIC,
 * and returns the transaction hash as proof of payment to the server.
 *
 * @example
 * ```ts
 * import { polygon } from 'mppx/client'
 * import { createWalletClient, http, parseAbi } from 'viem'
 * import { polygon as polygonChain } from 'viem/chains'
 *
 * const walletClient = createWalletClient({ chain: polygonChain, transport: http() })
 * const erc20Abi = parseAbi(['function transfer(address to, uint256 amount) returns (bool)'])
 *
 * const mppx = Mppx.create({
 *   methods: [
 *     polygon({
 *       sendTransaction: async ({ amount, currency, recipient }) => {
 *         return await walletClient.writeContract({
 *           address: currency,
 *           abi: erc20Abi,
 *           functionName: 'transfer',
 *           args: [recipient, BigInt(amount)],
 *         })
 *       },
 *     }),
 *   ],
 * })
 * ```
 */
export function charge(parameters: charge.Parameters) {
  const { externalId, sendTransaction } = parameters

  return Method.toClient(Methods.charge, {
    async createCredential({ challenge }) {
      const { request } = challenge
      const amount = request.amount as string
      const currency = request.currency as Address
      const recipient = request.recipient as Address
      const chainId =
        (request.methodDetails?.chainId as number | undefined) ?? defaults.chainId.mainnet

      const hash = await sendTransaction({ amount, chainId, challenge, currency, recipient })

      return Credential.serialize({
        challenge,
        payload: { hash, type: 'hash' as const },
        ...(externalId ? { source: externalId } : {}),
      })
    },
  })
}

export declare namespace charge {
  type Parameters = {
    /** Optional client-side external reference ID. */
    externalId?: string | undefined
    /**
     * Called when a Polygon charge challenge is received.
     * Must broadcast an ERC-20 `transfer` on Polygon and return the transaction hash.
     * The client pays gas in MATIC.
     */
    sendTransaction: (parameters: OnChallengeParameters) => Promise<`0x${string}`>
  }

  type OnChallengeParameters = {
    /** Payment amount in base units (e.g. USDC: 1000000 = $1.00). */
    amount: string
    /** Chain ID (defaults to 137 for Polygon mainnet). */
    chainId: number
    /** The full challenge object from the server. */
    challenge: Challenge.Challenge<
      z.output<typeof Methods.charge.schema.request>,
      typeof Methods.charge.intent,
      typeof Methods.charge.name
    >
    /** ERC-20 token contract address. */
    currency: Address
    /** Recipient address. */
    recipient: Address
  }
}
