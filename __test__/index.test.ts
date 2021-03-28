import * as Redis from 'ioredis'
import { RedisCache } from '../src'

const mockFn = async <T>(n: number, val: T) =>
  new Promise((r) => {
    setTimeout(() => r(val), n)
  })

const repeatCall = (n: number, fn: Function) =>
  Promise.all(
    Array(n)
      .fill(null)
      .map((_) => fn())
  )

it('cacheFn should works well', async () => {
  const fn = jest.fn(mockFn)
  const c = new RedisCache({
    redis: new Redis(),
    prefix: 'test',
  })

  const mockRes = { name: 'test', age: 18 }
  const cf = c.cacheWrapper('fn', fn, 20)
  expect(await cf(100, mockRes)).toEqual(mockRes)
  expect(fn).toBeCalledTimes(1)
  await repeatCall(10, async () => {
    const res = await cf(100, mockRes)
    expect(res).toEqual(mockRes)
  })
  expect(fn).toBeCalledTimes(1)

  const mockRes2 = { name: 'test2', age: 19 }
  expect(await cf(100, mockRes2)).toEqual(mockRes2)
  expect(fn).toBeCalledTimes(2)
  await repeatCall(10, async () => {
    const res = await cf(100, mockRes2)
    expect(res).toEqual(mockRes2)
  })
  expect(fn).toBeCalledTimes(2)
})

it('not found should cache', async () => {
  const fn = jest.fn(mockFn)
  const c = new RedisCache({
    redis: new Redis(),
    prefix: 'test1',
  })

  const cf = c.cacheWrapper('fn', fn, 20)
  expect(await cf(100, null)).toBe(null)
  expect(fn).toBeCalledTimes(1)
  await repeatCall(10, () => cf(100, null))
  expect(fn).toBeCalledTimes(1)
})

it('raw codec should works well', async () => {
  const fn = jest.fn(mockFn)
  const c = new RedisCache({
    redis: new Redis(),
    prefix: 'test',
    codec: 'raw',
  })

  const mockRes = 'raw test'
  const cf = c.cacheWrapper('fn', fn, 20)
  expect(await cf(100, mockRes)).toBe(mockRes)
  expect(fn).toBeCalledTimes(1)
  await repeatCall(10, async () => {
    const res = await cf(100, mockRes)
    expect(res).toBe(mockRes)
  })
  expect(fn).toBeCalledTimes(1)
})
