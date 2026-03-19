import { parseUnits } from 'viem'
import * as Method from '../Method.js'
import * as z from '../zod.js'

/**
 * Polygon charge intent for one-time ERC-20 token transfers on Polygon mainnet.
 *
 * The client broadcasts an ERC-20 `transfer` transaction on-chain, pays gas
 * in MATIC, and submits the transaction hash as proof. The server verifies
 * the Transfer event log on the receipt.
 *
 * Credential payload:
 * - `hash`: Transaction hash of the on-chain ERC-20 transfer.
 */
export const charge = Method.from({
  name: 'polygon',
  intent: 'charge',
  schema: {
    credential: {
      payload: z.object({
        hash: z.hash(),
        type: z.literal('hash'),
      }),
    },
    request: z.pipe(
      z.object({
        amount: z.amount(),
        chainId: z.optional(z.number()),
        currency: z.string(),
        decimals: z.number(),
        description: z.optional(z.string()),
        externalId: z.optional(z.string()),
        recipient: z.optional(z.string()),
      }),
      z.transform(({ amount, chainId, decimals, ...rest }) => ({
        ...rest,
        amount: parseUnits(amount, decimals).toString(),
        ...(chainId !== undefined
          ? { methodDetails: { chainId } }
          : {}),
      })),
    ),
  },
})
