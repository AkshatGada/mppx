import { Methods } from 'mppx/polygon'
import { describe, expect, expectTypeOf, test } from 'vitest'

describe('charge', () => {
  test('has correct name and intent', () => {
    expect(Methods.charge.intent).toBe('charge')
    expect(Methods.charge.name).toBe('polygon')
  })

  test('types: intent is literal', () => {
    expectTypeOf(Methods.charge.intent).toEqualTypeOf<'charge'>()
  })

  test('types: name is literal', () => {
    expectTypeOf(Methods.charge.name).toEqualTypeOf<'polygon'>()
  })

  test('schema: validates valid request', () => {
    const result = Methods.charge.schema.request.safeParse({
      amount: '10',
      currency: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      decimals: 6,
      recipient: '0x1234567890abcdef1234567890abcdef12345678',
    })
    expect(result.success).toBe(true)
  })

  test('schema: validates request with optional fields', () => {
    const result = Methods.charge.schema.request.safeParse({
      amount: '10',
      chainId: 137,
      currency: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      decimals: 6,
      description: 'Test payment',
      externalId: 'order_123',
      recipient: '0x1234567890abcdef1234567890abcdef12345678',
    })
    expect(result.success).toBe(true)
  })

  test('schema: transforms amount to base units', () => {
    const result = Methods.charge.schema.request.safeParse({
      amount: '10',
      currency: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      decimals: 6,
      recipient: '0x1234567890abcdef1234567890abcdef12345678',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.amount).toBe('10000000')
    }
  })

  test('schema: rejects invalid request (missing required fields)', () => {
    const result = Methods.charge.schema.request.safeParse({
      amount: '1',
    })
    expect(result.success).toBe(false)
  })

  test('schema: validates hash payload', () => {
    const result = Methods.charge.schema.credential.payload.safeParse({
      hash: `0x${'ab'.repeat(32)}`,
      type: 'hash',
    })
    expect(result.success).toBe(true)
  })

  test('schema: rejects payload without hash', () => {
    const result = Methods.charge.schema.credential.payload.safeParse({
      type: 'hash',
    })
    expect(result.success).toBe(false)
  })

  test('schema: rejects unknown payload type', () => {
    const result = Methods.charge.schema.credential.payload.safeParse({
      type: 'authorization',
      signature: '0xabcdef',
    })
    expect(result.success).toBe(false)
  })

  test('schema: chainId is placed in methodDetails', () => {
    const result = Methods.charge.schema.request.safeParse({
      amount: '1',
      chainId: 137,
      currency: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      decimals: 6,
      recipient: '0x1234567890abcdef1234567890abcdef12345678',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.methodDetails?.chainId).toBe(137)
    }
  })
})
