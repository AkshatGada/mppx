import { charge as charge_ } from './Charge.js'

/**
 * Creates a Polygon `charge` method for usage on the server.
 *
 * @example
 * ```ts
 * import { Mppx, polygon } from 'mppx/server'
 *
 * const mppx = Mppx.create({
 *   methods: [polygon({ rpcUrl: 'https://polygon-rpc.com' })],
 * })
 * ```
 */
export function polygon<const parameters extends polygon.Parameters>(parameters: parameters) {
  return [polygon.charge(parameters)] as const
}

export namespace polygon {
  export type Parameters = charge_.Parameters

  /** Creates a Polygon `charge` method for ERC-20 transfer verification. */
  export const charge = charge_
}
