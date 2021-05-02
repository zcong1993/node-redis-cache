import * as Redis from 'ioredis'
import { RedisCache, ShardingCache, ShardingOption } from '../src'

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

const createShardingCache = (prefix: string, num: number = 2) => {
  const options: ShardingOption = { nodes: [] }
  for (let i = 1; i <= num; i++) {
    options.nodes.push({
      key: `redis-${i}`,
      redisCache: new RedisCache({
        redis: new Redis(`redis://localhost:6379/${i}`),
        prefix: prefix,
      }),
      weight: 100,
    })
  }
  return new ShardingCache(options)
}

it('ShardingCache cacheWrapper should works well', async () => {
  const fn = jest.fn(mockFn)

  const c = createShardingCache('test')

  const mockRes = { name: 'test', age: 18 }
  const cf = c.cacheWrapper('fn', fn, 5)
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

it('ShardingCache not found should cache', async () => {
  const fn = jest.fn(mockFn)
  const c = createShardingCache('test1')

  const cf = c.cacheWrapper('fn', fn, 5)
  expect(await cf(100, null)).toBe(null)
  expect(fn).toBeCalledTimes(1)
  await repeatCall(10, () => cf(100, null))
  expect(fn).toBeCalledTimes(1)
})

it('ShardingCache cacheFn should works well', async () => {
  const fn = jest.fn(mockFn)
  const c = createShardingCache('test4')

  const mockRes = { name: 'test', age: 18 }
  const cf = () => c.cacheFn('fn', () => fn(100, mockRes), 5)
  expect(await cf()).toEqual(mockRes)
  await repeatCall(10, async () => {
    const res = await cf()
    expect(res).toEqual(mockRes)
  })
  expect(fn).toBeCalledTimes(1)
})

it('ShardingCache deleteFnCache should works well', async () => {
  const fn = jest.fn(mockFn)
  const c = createShardingCache('test7')

  const mockRes = { name: 'test', age: 18 }
  const cf = c.cacheWrapper('fn', fn, 5)
  expect(await cf(100, mockRes)).toEqual(mockRes)
  expect(fn).toBeCalledTimes(1)
  await repeatCall(2, async () => {
    const res = await cf(100, mockRes)
    expect(res).toEqual(mockRes)
  })
  expect(fn).toBeCalledTimes(1)

  await c.deleteFnCache('fn', [100, mockRes])

  expect(await cf(100, mockRes)).toEqual(mockRes)
  expect(fn).toBeCalledTimes(2)
})

it('ShardingCache get set should works well', async () => {
  const c = createShardingCache('test8')

  const keys = Array(10)
    .fill(null)
    .map((_, i) => `key-${i}`)
  const mockRes = keys.map((key) => ({ key }))

  for (let i = 0; i < keys.length; i++) {
    await c.set(keys[i], mockRes[i], 5)
  }

  await Promise.all(
    Array(10)
      .fill(null)
      .map((_, i) => {
        return repeatCall(5, async () => {
          const [res] = await c.get(keys[i])
          expect(res).toEqual(mockRes[i])
        })
      })
  )
})

it('clean should works well', async () => {
  const c = createShardingCache('test9')

  const keys = Array(10)
    .fill(null)
    .map((_, i) => `key-${i}`)
  const mockRes = keys.map((key) => ({ key }))

  for (let i = 0; i < keys.length; i++) {
    await c.set(keys[i], mockRes[i], 5)
  }

  await c.clean()

  await Promise.all(
    Array(10)
      .fill(null)
      .map((_, i) => {
        return repeatCall(5, async () => {
          const [res] = await c.get(keys[i])
          expect(res).toEqual(null)
        })
      })
  )
})