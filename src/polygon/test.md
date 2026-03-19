---
title: Polygon charge Intent for HTTP Payment Authentication
abbrev: Polygon Charge
docname: draft-polygon-charge-00
version: 00
category: info
ipr: trust200902
submissiontype: IETF
consensus: true

author:
  - name: Arjun Gada
    ins: A. Gada
    email: arjun@polygon.technology
    organization: Polygon Labs

normative:
  RFC2119:
  RFC3339:
  RFC4648:
  RFC8174:
  RFC8259:
  RFC8785:
  I-D.httpauth-payment:
    title: "The 'Payment' HTTP Authentication Scheme"
    target: https://datatracker.ietf.org/doc/draft-ietf-httpauth-payment/
    author:
      - name: Jake Moxey
    date: 2026-01

informative:
  EIP-712:
    title: "Typed structured data hashing and signing"
    target: https://eips.ethereum.org/EIPS/eip-712
    author:
      - name: Remco Bloemen
      - name: Leonid Logvinov
      - name: Jacob Evans
    date: 2017-09
  EIP-3009:
    title: "Transfer With Authorization"
    target: https://eips.ethereum.org/EIPS/eip-3009
    author:
      - name: Peter Jihoon Kim
      - name: Kevin Britz
      - name: David Knott
    date: 2020-09
  EIP-55:
    title: "Mixed-case checksum address encoding"
    target: https://eips.ethereum.org/EIPS/eip-55
    author:
      - name: Vitalik Buterin
    date: 2016-01
---

--- abstract

This document defines the "charge" intent for the "polygon" payment method
in the Payment HTTP Authentication Scheme {{I-D.httpauth-payment}}. It
specifies how clients and servers exchange one-time ERC-20 token transfers
on the Polygon PoS blockchain, with optional gasless payments via
ERC-3009 (Transfer With Authorization) {{EIP-3009}}.

--- middle

# Introduction

The `charge` intent represents a one-time payment of a specified amount
using ERC-20 tokens on the Polygon PoS network. Two settlement modes are
supported:

- **Push mode**: The client broadcasts an ERC-20 `transfer` transaction
  on-chain, pays gas, and submits the transaction hash as proof.
- **Pull mode (ERC-3009)**: The client signs an off-chain
  `transferWithAuthorization` message {{EIP-3009}}; the server (or a
  facilitator) submits the authorization on-chain and pays gas.

Pull mode enables gasless payments for clients: the payer only signs an
EIP-712 typed message, and the server bears the gas cost.

## Charge Flow — Push Mode

~~~
   Client                        Server                     Polygon Network
      |                             |                             |
      |  (1) GET /api/resource      |                             |
      |-------------------------->  |                             |
      |                             |                             |
      |  (2) 402 Payment Required   |                             |
      |      intent="charge"        |                             |
      |<--------------------------  |                             |
      |                             |                             |
      |  (3) ERC-20 transfer tx     |                             |
      |------------------------------------------------------>   |
      |                             |                             |
      |  (4) Transaction confirmed  |                             |
      |<------------------------------------------------------   |
      |                             |                             |
      |  (5) Authorization: Payment |                             |
      |      (with txHash)          |                             |
      |-------------------------->  |                             |
      |                             |  (6) eth_getTransactionReceipt
      |                             |-------------------------->  |
      |                             |  (7) Receipt returned       |
      |                             |<--------------------------  |
      |                             |                             |
      |  (8) 200 OK + Receipt       |                             |
      |<--------------------------  |                             |
      |                             |                             |
~~~

## Charge Flow — Pull Mode (ERC-3009)

~~~
   Client                        Server                     Polygon Network
      |                             |                             |
      |  (1) GET /api/resource      |                             |
      |-------------------------->  |                             |
      |                             |                             |
      |  (2) 402 Payment Required   |                             |
      |      intent="charge"        |                             |
      |      feePayer=true          |                             |
      |<--------------------------  |                             |
      |                             |                             |
      |  (3) Sign EIP-712           |                             |
      |      TransferWithAuth       |                             |
      |                             |                             |
      |  (4) Authorization: Payment |                             |
      |      (with authorization)   |                             |
      |-------------------------->  |                             |
      |                             |                             |
      |                             |  (5) transferWithAuthorization
      |                             |-------------------------->  |
      |                             |                             |
      |                             |  (6) Transfer complete      |
      |                             |<--------------------------  |
      |                             |                             |
      |  (7) 200 OK + Receipt       |                             |
      |<--------------------------  |                             |
      |                             |                             |
~~~

# Requirements Language

{::boilerplate bcp14-tagged}

# Terminology

ERC-20
: The standard interface for fungible tokens on EVM-compatible blockchains.
  Polygon supports ERC-20 tokens including USDC (`0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`)
  and USDT (`0xc2132D05D31c914a87C6611C10748AEb04B58e8F`).

ERC-3009
: An extension to ERC-20 that enables gasless token transfers via
  signed authorizations {{EIP-3009}}. The token holder signs an
  EIP-712 typed message authorizing a transfer, and any third party
  can submit the authorization on-chain by calling
  `transferWithAuthorization`.

EIP-712
: A standard for typed structured data hashing and signing {{EIP-712}},
  used by ERC-3009 to produce human-readable signing requests.

Facilitator
: A service that submits ERC-3009 authorizations on-chain on behalf of
  the server. The facilitator maintains a hot wallet funded with MATIC
  (or POL) for gas and exposes `/verify` and `/settle` endpoints.

# Request Schema

The `request` parameter in the `WWW-Authenticate` challenge contains a
base64url-encoded JSON object. The JSON MUST be serialized using JSON
Canonicalization Scheme (JCS) {{RFC8785}} before base64url encoding,
per {{I-D.httpauth-payment}}.

## Shared Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | string | REQUIRED | Amount in base units (stringified number) |
| `currency` | string | REQUIRED | ERC-20 token contract address (e.g., `"0x3c49..."`) |
| `recipient` | string | REQUIRED | Recipient address (EIP-55 checksummed) |
| `description` | string | OPTIONAL | Human-readable payment description |
| `externalId` | string | OPTIONAL | Merchant's reference (order ID, invoice number, etc.) |

Challenge expiry is conveyed by the `expires` auth-param in
`WWW-Authenticate` per {{I-D.httpauth-payment}}.

## Method Details

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `methodDetails.chainId` | number | OPTIONAL | Polygon chain ID (default: 137) |
| `methodDetails.feePayer` | boolean | OPTIONAL | If `true`, server pays gas via ERC-3009 pull mode (default: `false`) |

**Example (push mode):**

~~~json
{
  "amount": "1000000",
  "currency": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00",
  "methodDetails": {
    "chainId": 137
  }
}
~~~

This requests a transfer of 1.00 USDC (1000000 base units, 6 decimals).

**Example (pull mode / gasless):**

~~~json
{
  "amount": "1000000",
  "currency": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00",
  "methodDetails": {
    "chainId": 137,
    "feePayer": true
  }
}
~~~

When `feePayer` is `true`, the client signs an ERC-3009
`transferWithAuthorization` message instead of broadcasting a transaction.

# Credential Schema

The credential in the `Authorization` header contains a base64url-encoded
JSON object per {{I-D.httpauth-payment}}.

## Credential Structure

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `challenge` | object | REQUIRED | Echo of the challenge from the server |
| `payload` | object | REQUIRED | Polygon-specific payload object |
| `source` | string | OPTIONAL | Payer identifier as a DID (e.g., `did:pkh:eip155:137:0x...`) |

The `source` field, if present, SHOULD use the `did:pkh` method with
chain ID `137` (Polygon mainnet) and the payer's Ethereum address.

## Hash Payload (type="hash")

Used in push mode when the client has already broadcast the ERC-20
`transfer` transaction on-chain.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hash` | string | REQUIRED | Transaction hash with `0x` prefix |
| `type` | string | REQUIRED | `"hash"` |

**Example:**

~~~json
{
  "challenge": {
    "id": "abc123def456",
    "realm": "api.example.com",
    "method": "polygon",
    "intent": "charge",
    "request": "eyJ...",
    "expires": "2026-01-06T12:00:00Z"
  },
  "payload": {
    "hash": "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890",
    "type": "hash"
  },
  "source": "did:pkh:eip155:137:0x1234567890abcdef1234567890abcdef12345678"
}
~~~

## Transaction Payload (type="transaction")

Used in push mode when the client submits a signed (but not yet
broadcast) ERC-20 transfer transaction for the server to broadcast.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `signature` | string | REQUIRED | Hex-encoded signed transaction |
| `type` | string | REQUIRED | `"transaction"` |

**Example:**

~~~json
{
  "challenge": {
    "id": "abc123def456",
    "realm": "api.example.com",
    "method": "polygon",
    "intent": "charge",
    "request": "eyJ...",
    "expires": "2026-01-06T12:00:00Z"
  },
  "payload": {
    "signature": "0x02f8...signed transaction bytes...",
    "type": "transaction"
  },
  "source": "did:pkh:eip155:137:0x1234567890abcdef1234567890abcdef12345678"
}
~~~

## Authorization Payload (type="authorization")

Used in pull mode (ERC-3009). The client signs an EIP-712
`TransferWithAuthorization` message. The server (or facilitator) calls
`transferWithAuthorization` on the token contract to execute the transfer.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | REQUIRED | `"authorization"` |
| `from` | string | REQUIRED | Payer address |
| `to` | string | REQUIRED | Recipient address |
| `value` | string | REQUIRED | Transfer amount in base units |
| `validAfter` | string | REQUIRED | Unix timestamp (earliest execution time) |
| `validBefore` | string | REQUIRED | Unix timestamp (latest execution time) |
| `nonce` | string | REQUIRED | Unique `bytes32` nonce with `0x` prefix |
| `signature` | string | REQUIRED | EIP-712 signature with `0x` prefix |

**Example:**

~~~json
{
  "challenge": {
    "id": "abc123def456",
    "realm": "api.example.com",
    "method": "polygon",
    "intent": "charge",
    "request": "eyJ...",
    "expires": "2026-01-06T12:00:00Z"
  },
  "payload": {
    "type": "authorization",
    "from": "0x1234567890abcdef1234567890abcdef12345678",
    "to": "0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00",
    "value": "1000000",
    "validAfter": "0",
    "validBefore": "1735992000",
    "nonce": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "signature": "0xabcdef...65 bytes..."
  },
  "source": "did:pkh:eip155:137:0x1234567890abcdef1234567890abcdef12345678"
}
~~~

### EIP-712 Domain

The EIP-712 domain for USDC on Polygon is:

| Field | Value |
|-------|-------|
| `name` | `"USD Coin"` |
| `version` | `"2"` |
| `chainId` | `137` |
| `verifyingContract` | Token contract address |

Other ERC-3009 tokens MAY use different domain parameters. Clients MUST
use the domain parameters specified by the token contract.

### TransferWithAuthorization Type

The EIP-712 primary type for ERC-3009:

~~~
TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)
~~~

# Fee Payment

When a request includes `feePayer: true`, the server commits to paying
gas costs on behalf of the client using the ERC-3009 pull mode.

## Server-Paid Fees (Pull Mode)

When `feePayer: true`:

1. **Client signs authorization**: The client signs an EIP-712
   `TransferWithAuthorization` message. No gas is required from the
   client.

2. **Server receives credential**: The server extracts the ERC-3009
   authorization parameters and signature from the credential payload.

3. **Server submits on-chain**: The server (or a delegated facilitator
   service) calls `transferWithAuthorization` on the ERC-20 token
   contract, passing the client's authorization. The server pays gas
   in MATIC/POL.

4. **Transfer executes**: The token contract verifies the EIP-712
   signature, checks the nonce has not been used, verifies the
   validity window, and executes the transfer from payer to recipient.

## Client-Paid Fees (Push Mode)

When `feePayer: false` or omitted, the client broadcasts an ERC-20
`transfer` transaction directly and pays gas in MATIC/POL. The client
submits the transaction hash (or signed transaction) as the credential
payload.

## Server Requirements

When acting as fee payer, servers:

- MUST maintain sufficient MATIC/POL balance to pay gas fees, either
  directly or via a facilitator service
- MUST verify the ERC-3009 authorization parameters match the challenge
  request before submitting on-chain
- MAY delegate on-chain submission to a facilitator service
- MAY recover gas costs through pricing or other business logic

## Client Requirements

- When `feePayer: true`: Clients MUST submit an `authorization` type
  credential with a valid EIP-712 signature
- When `feePayer: false` or omitted: Clients MUST broadcast the ERC-20
  transfer themselves and submit a `hash` or `transaction` type credential

# Settlement Procedure

## Push Settlement (Hash)

For credentials with `type="hash"`, the client has already broadcast
the transaction. The server verifies the transaction on-chain:

1. Client broadcasts ERC-20 `transfer` transaction to Polygon
2. Client submits transaction hash in credential
3. Server calls `eth_getTransactionReceipt` to fetch the receipt
4. Server verifies the `Transfer` event log matches the challenge
   parameters (token, from, to, amount)
5. Server returns `Payment-Receipt` header

## Push Settlement (Transaction)

For credentials with `type="transaction"`, the server broadcasts the
signed transaction:

1. Client signs ERC-20 `transfer` transaction
2. Client submits signed transaction in credential
3. Server broadcasts via `eth_sendRawTransaction`
4. Server waits for confirmation
5. Server verifies the `Transfer` event log
6. Server returns `Payment-Receipt` header

## Pull Settlement (Authorization)

For credentials with `type="authorization"`, the server submits the
ERC-3009 authorization on-chain:

1. Client signs EIP-712 `TransferWithAuthorization`
2. Client submits authorization parameters and signature in credential
3. Server calls `transferWithAuthorization(from, to, value, validAfter,
   validBefore, nonce, signature)` on the token contract
4. Server waits for confirmation
5. Server verifies the `Transfer` event log
6. Server returns `Payment-Receipt` header

## Transaction Verification {#transaction-verification}

For all settlement types, servers MUST verify:

1. The transaction executed on the correct chain (chainId 137)
2. The token contract matches the `currency` in the challenge
3. The `Transfer` event was emitted with correct `from`, `to`, and
   `value` fields matching the challenge request
4. The transfer amount is greater than or equal to the requested amount
5. The recipient matches the challenge request recipient

For authorization credentials, servers MUST additionally verify before
submitting:

1. The `from` address matches the `source` DID (if present)
2. The `to` address matches the challenge `recipient`
3. The `value` matches the challenge `amount`
4. The `validBefore` timestamp has not passed
5. The `nonce` has not been used (checked on-chain during execution)

## Receipt Generation

Upon successful settlement, servers MUST return a `Payment-Receipt`
header per {{I-D.httpauth-payment}}.

The receipt payload for Polygon charge:

| Field | Type | Description |
|-------|------|-------------|
| `method` | string | `"polygon"` |
| `reference` | string | Transaction hash of the settlement transaction |
| `status` | string | `"success"` |
| `timestamp` | string | {{RFC3339}} settlement time |
| `externalId` | string | OPTIONAL. Echoed from the challenge request |

# Security Considerations

## Transaction Replay

ERC-20 transfers are protected by the Ethereum nonce mechanism.
ERC-3009 authorizations include a unique `nonce` (bytes32) that is
marked as used on the token contract after execution, preventing replay.

Servers MUST NOT submit the same ERC-3009 authorization twice.

## Chain Reorganization

Polygon PoS has probabilistic finality. Servers SHOULD wait for a
sufficient number of block confirmations before considering a payment
final. The recommended minimum is 64 blocks (~2 minutes).

For high-value payments, servers MAY require additional confirmations
or use checkpointed finality.

## Amount Verification

Clients MUST parse and verify the `request` payload before signing:

1. Verify `amount` is reasonable for the service
2. Verify `currency` is the expected token contract address
3. Verify `recipient` is controlled by the expected party
4. For ERC-3009: verify the `validBefore` window is reasonable

## Authorization Scope

ERC-3009 authorizations are scoped to a single transfer of a specific
amount. Unlike ERC-20 `approve`, they cannot be used to drain more
than the authorized amount. This makes them safer for one-time payments.

However, clients MUST still verify:

- The `value` matches the expected payment amount
- The `to` address matches the expected recipient
- The `validBefore` timestamp provides a reasonable expiry window

## Server-Paid Fees

Servers acting as fee payers accept financial risk in exchange for
providing a gasless payment experience.

**Denial of Service**: Malicious clients could submit invalid ERC-3009
signatures, causing the server to attempt on-chain submission that
reverts (wasting gas). Servers SHOULD validate the EIP-712 signature
off-chain before submitting and implement rate limiting.

**Gas Price Spikes**: Polygon gas prices can spike during network
congestion. Servers SHOULD set gas price limits and MAY reject payment
requests during periods of extreme gas prices.

**Nonce Collision**: If a client reuses a nonce, the on-chain call will
revert. Servers SHOULD verify nonce uniqueness against their own records
before attempting submission.

## Transport Security

All Payment authentication flows MUST use TLS 1.2 or later per
{{I-D.httpauth-payment}}. Payment credentials contain signed
authorization data that could result in financial loss if intercepted.

# IANA Considerations

## Payment Method Registration

This document registers the following payment method in the "HTTP Payment
Methods" registry established by {{I-D.httpauth-payment}}:

| Method Identifier | Description | Reference |
|-------------------|-------------|-----------|
| `polygon` | Polygon PoS ERC-20 token transfer | This document |

Contact: Polygon Labs (<contact@polygon.technology>)

## Payment Intent Registration

This document registers the following payment intent in the "HTTP Payment
Intents" registry established by {{I-D.httpauth-payment}}:

| Intent | Applicable Methods | Description | Reference |
|--------|-------------------|-------------|-----------|
| `charge` | `polygon` | One-time ERC-20 transfer on Polygon PoS | This document |

--- back

# ABNF Collected

~~~ abnf
polygon-charge-challenge = "Payment" 1*SP
  "id=" quoted-string ","
  "realm=" quoted-string ","
  "method=" DQUOTE "polygon" DQUOTE ","
  "intent=" DQUOTE "charge" DQUOTE ","
  "request=" base64url-nopad

polygon-charge-credential = "Payment" 1*SP base64url-nopad

; Base64url encoding without padding per RFC 4648 Section 5
base64url-nopad = 1*( ALPHA / DIGIT / "-" / "_" )
~~~

# Example

**Challenge (push mode):**

~~~http
HTTP/1.1 402 Payment Required
WWW-Authenticate: Payment id="poly_abc123",
  realm="api.example.com",
  method="polygon",
  intent="charge",
  request="eyJhbW91bnQiOiIxMDAwMDAwIiwiY3VycmVuY3kiOiIweDNjNDk5YzU0MmNFRjVFMzgxMWUxMTkyY2U3MGQ4Y0MwM2Q1YzMzNTkiLCJyZWNpcGllbnQiOiIweDc0MmQzNUNjNjYzNEMwNTMyOTI1YTNiODQ0QmM5ZTc1OTVmOGZFMDAifQ",
  expires="2026-01-06T12:00:00Z"
Cache-Control: no-store
~~~

The `request` decodes to:

~~~json
{
  "amount": "1000000",
  "currency": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00"
}
~~~

This requests a transfer of 1.00 USDC (1000000 base units, 6 decimals)
on Polygon mainnet.

**Challenge (pull mode / gasless):**

~~~http
HTTP/1.1 402 Payment Required
WWW-Authenticate: Payment id="poly_def456",
  realm="api.example.com",
  method="polygon",
  intent="charge",
  request="eyJhbW91bnQiOiIxMDAwMDAwIiwiY3VycmVuY3kiOiIweDNjNDk5YzU0MmNFRjVFMzgxMWUxMTkyY2U3MGQ4Y0MwM2Q1YzMzNTkiLCJtZXRob2REZXRhaWxzIjp7ImNoYWluSWQiOjEzNywiZmVlUGF5ZXIiOnRydWV9LCJyZWNpcGllbnQiOiIweDc0MmQzNUNjNjYzNEMwNTMyOTI1YTNiODQ0QmM5ZTc1OTVmOGZFMDAifQ",
  expires="2026-01-06T12:00:00Z"
Cache-Control: no-store
~~~

The `request` decodes to:

~~~json
{
  "amount": "1000000",
  "currency": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00",
  "methodDetails": {
    "chainId": 137,
    "feePayer": true
  }
}
~~~

**Credential (authorization / pull mode):**

~~~http
GET /api/resource HTTP/1.1
Host: api.example.com
Authorization: Payment eyJjaGFsbGVuZ2UiOnsiaWQiOiJwb2x5X2RlZjQ1NiJ9LCJwYXlsb2FkIjp7InR5cGUiOiJhdXRob3JpemF0aW9uIiwiZnJvbSI6IjB4MTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NTY3OCIsInRvIjoiMHg3NDJkMzVDYzY2MzRDMDUzMjkyNWEzYjg0NEJjOWU3NTk1ZjhmRTAwIiwidmFsdWUiOiIxMDAwMDAwIiwidmFsaWRBZnRlciI6IjAiLCJ2YWxpZEJlZm9yZSI6IjE3MzU5OTIwMDAiLCJub25jZSI6IjB4YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYSIsInNpZ25hdHVyZSI6IjB4YWJjZGVmLi4uNjUgYnl0ZXMuLi4ifSwic291cmNlIjoiZGlkOnBraDplaXAxNTU6MTM3OjB4MTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NTY3OCJ9
~~~

# Acknowledgements

The authors thank the Polygon community and Tempo Labs for their work
on the Payment HTTP Authentication Scheme.
