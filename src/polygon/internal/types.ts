/**
 * Duck-typed interface for an EVM JSON-RPC provider.
 * Matches the subset of the API used by mppx for server-side transaction verification.
 */
export type EvmProvider = {
  getTransactionReceipt(hash: string): Promise<TransactionReceipt | null>
}

export type TransactionReceipt = {
  transactionHash: string
  status: 'success' | 'reverted' | string
  logs: readonly TransactionLog[]
}

export type TransactionLog = {
  address: string
  topics: readonly string[]
  data: string
}
