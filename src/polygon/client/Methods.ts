import { charge as charge_ } from './Charge.js'

/**
 * Creates a Polygon `charge` client method.
 *
 * @example
 * ```ts
 * import { Mppx, polygon } from 'mppx/client'
 *
 * const mppx = Mppx.create({
 *   methods: [
 *     polygon({
 *       sendTransaction: async ({ amount, currency, recipient }) => {
 *         const hash = await wallet.sendTransaction(...)
 *         return hash
 *       },
 *     }),
 *   ],
 * })
 * ```
 */
export function polygon(parameters: polygon.Parameters) {
  return [charge_(parameters)] as const
}

export namespace polygon {
  export type Parameters = charge_.Parameters

  /** Creates a Polygon `charge` client method for ERC-20 transfers. */
  export const charge = charge_
}
