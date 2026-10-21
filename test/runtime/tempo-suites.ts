/**
 * Suites sharing the funded Tempo accounts. Keep these serial within each shard.
 * Values are summed test durations (ms), refreshed weekly by the Rebalance Test
 * Shards workflow from successful main CI reports. Membership is maintained
 * manually because it determines which suites need shared chain fixtures.
 */
export const tempoSuites: Record<string, number> = {
  'src/cli/cli.test.ts': 5279,
  'src/client/Mppx.test.ts': 636,
  'src/client/internal/Fetch.test.ts': 1511,
  'src/mcp/client/McpClient.integration.test.ts': 5478,
  'src/mcp/client/McpClient.test.ts': 509,
  'src/middlewares/elysia.test.ts': 956,
  'src/middlewares/express.test.ts': 1379,
  'src/middlewares/hono.test.ts': 1086,
  'src/middlewares/nextjs.test.ts': 1226,
  'src/proxy/Proxy.test.ts': 2950,
  'src/proxy/services/anthropic.test.ts': 257,
  'src/proxy/services/openai.test.ts': 48,
  'src/proxy/services/stripe.test.ts': 289,
  'src/server/Methods.test.ts': 22,
  'src/server/Mppx.test.ts': 2082,
  'src/tempo/AccessKeyAuthorization.test.ts': 209,
  'src/tempo/internal/fee-token.test.ts': 2233,
  'src/tempo/legacy/AccessKeyAuthorization.test.ts': 3118,
  'src/tempo/legacy/client/ChannelOps.test.ts': 459,
  'src/tempo/legacy/client/Session.test.ts': 510,
  'src/tempo/legacy/session/Chain.test.ts': 9403,
  'src/tempo/server/Charge.test.ts': 34702,
  'src/tempo/session/precompile/Chain.integration.test.ts': 5170,
  'src/tempo/session/server/Session.integration.test.ts': 7607,
  'src/x402/Exact.e2e.test.ts': 170,
}
