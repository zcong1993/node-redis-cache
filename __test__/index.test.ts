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
