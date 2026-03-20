import { PaymentExpiredError, VerificationFailedError } from '../../Errors.js'
import type { LooseOmit, OneOf } from '../../internal/types.js'
import * as Method from '../../Method.js'
import type { EvmProvider } from '../internal/types.js'
import * as Methods from '../Methods.js'

/** ERC-20 Transfer event topic: keccak256("Transfer(address,address,uint256)"). */
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

/**
 * Creates a Polygon charge method intent for usage on the server.
 *
 * Verifies payment by fetching the on-chain transaction receipt and checking
 * for a matching ERC-20 `Transfer` event log. The client pays gas; the server
 * only reads from the chain.
 *
 * Provide either `rpcUrl` (a Polygon JSON-RPC endpoint) or `provider` (a
 * pre-configured viem/ethers public client).
 *
 * @example
 * ```ts
 * import { polygon } from 'mppx/server'
 *
 * const mppx = Mppx.create({
 *   methods: [
 *     polygon({
 *       rpcUrl: 'https://rpc.ankr.com/polygon',
 *       currency: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // USDC
 *       decimals: 6,
 *     }),
 *   ],
 * })
 * ```
 */
export function charge<const parameters extends charge.Parameters>(parameters: parameters) {
  const { amount, chainId, currency, decimals, description, externalId } = parameters

  const provider = 'provider' in parameters ? parameters.provider : undefined
  const rpcUrl = 'rpcUrl' in parameters ? parameters.rpcUrl : undefined

  type Defaults = charge.DeriveDefaults<parameters>
  return Method.toServer<typeof Methods.charge, Defaults>(Methods.charge, {
    defaults: {
      amount,
      chainId,
      currency,
      decimals,
      description,
      externalId,
    } as unknown as Defaults,

    async verify({ credential }) {
      const { challenge } = credential
      const { request } = challenge

      if (challenge.expires && new Date(challenge.expires) < new Date())
        throw new PaymentExpiredError({ expires: challenge.expires })

      const parsed = Methods.charge.schema.credential.payload.safeParse(credential.payload)
      if (!parsed.success) throw new VerificationFailedError({ reason: 'Invalid credential payload' })

      const payload = parsed.data
      const hash = payload.hash as `0x${string}`

      // Fetch the receipt from the chain
      const receipt = provider
        ? await provider.getTransactionReceipt(hash)
        : await fetchReceipt(rpcUrl!, hash)

      if (!receipt) throw new VerificationFailedError({ reason: 'Transaction not found' })
      if (receipt.status !== 'success' && receipt.status !== '0x1')
        throw new VerificationFailedError({ reason: `Transaction reverted: ${receipt.status}` })

      const expectedCurrency = (request.currency as string).toLowerCase()
      const expectedAmount = BigInt(request.amount as string)
      const expectedRecipient = request.recipient
        ? (request.recipient as string).toLowerCase()
        : undefined

      const transferLog = findTransferLog(receipt.logs, {
        currency: expectedCurrency,
        recipient: expectedRecipient,
        amount: expectedAmount,
      })

      if (!transferLog)
        throw new VerificationFailedError({
          reason: 'No matching ERC-20 Transfer event found in transaction',
        })

      return {
        method: 'polygon',
        status: 'success',
        timestamp: new Date().toISOString(),
        reference: hash,
      } as const
    },
  })
}

export declare namespace charge {
  type Defaults = LooseOmit<Method.RequestDefaults<typeof Methods.charge>, 'recipient'>

  type Parameters = Defaults &
    OneOf<
      | {
          /** Pre-configured EVM provider for fetching transaction receipts. */
          provider: EvmProvider
        }
      | {
          /** Polygon JSON-RPC URL. */
          rpcUrl: string
        }
    >

  type DeriveDefaults<parameters extends Parameters> = Pick<
    parameters,
    Extract<keyof parameters, keyof Defaults>
  > & { decimals: number }
}

/** Finds a matching ERC-20 Transfer log in a receipt. */
function findTransferLog(
  logs: readonly { address: string; topics: readonly string[]; data: string }[],
  expected: { currency: string; recipient: string | undefined; amount: bigint },
) {
  return logs.find((log) => {
    if (log.address.toLowerCase() !== expected.currency) return false
    if (!log.topics[0] || log.topics[0] !== TRANSFER_TOPIC) return false
    if (!log.topics[2]) return false
    const to = `0x${log.topics[2].slice(26)}`.toLowerCase()
    if (expected.recipient && to !== expected.recipient) return false
    const value = BigInt(log.data)
    return value >= expected.amount
  })
}

/** Fetches a transaction receipt via raw JSON-RPC. */
async function fetchReceipt(
  rpcUrl: string,
  hash: string,
): Promise<{ transactionHash: string; status: string; logs: readonly any[] } | null> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getTransactionReceipt',
      params: [hash],
    }),
  })

  if (!response.ok)
    throw new VerificationFailedError({ reason: 'Failed to fetch transaction receipt' })

  const json = (await response.json()) as { result: any }
  if (!json.result) return null

  return {
    transactionHash: json.result.transactionHash,
    status: json.result.status === '0x1' ? 'success' : json.result.status,
    logs: json.result.logs ?? [],
  }
}
