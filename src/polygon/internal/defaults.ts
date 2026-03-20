export const chainId = {
  mainnet: 137,
} as const
export type ChainId = (typeof chainId)[keyof typeof chainId]

/** Well-known ERC-20 token addresses on Polygon mainnet. */
export const tokens = {
  /** USDC (native) on Polygon. */
  usdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  /** USDT on Polygon. */
  usdt: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
} as const

/** Default currency per chain. */
export const currency = {
  [chainId.mainnet]: tokens.usdc,
} as const satisfies Record<ChainId, string>

/**
 * Default token decimals for USDC/USDT on Polygon.
 *
 * Both USDC and USDT use 6 decimals on Polygon.
 */
export const decimals = 6

/** Default RPC URLs for Polygon. */
export const rpcUrl = {
  [chainId.mainnet]: 'https://rpc.ankr.com/polygon',
} as const satisfies Record<ChainId, string>
