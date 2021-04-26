import * as Redis from 'ioredis'
import { ValueType } from 'ioredis'
import { register } from 'prom-client'
import {
  RedisCache,
  Codec,
  registerCodec,
  setDefaultCodec,
  getCodec,
} from '../src'

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

it('cacheWrapper should works well', async () => {
  const fn = jest.fn(mockFn)
  const c = new RedisCache({
    redis: new Redis(),
    prefix: 'test',
  })

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

it('not found should cache', async () => {
  const fn = jest.fn(mockFn)
  const c = new RedisCache({
    redis: new Redis(),
    prefix: 'test1',
  })

  const cf = c.cacheWrapper('fn', fn, 5)
  expect(await cf(100, null)).toBe(null)
  expect(fn).toBeCalledTimes(1)
  await repeatCall(10, () => cf(100, null))
  expect(fn).toBeCalledTimes(1)
})

it('raw codec should works well', async () => {
  const fn = jest.fn(mockFn)
  const c = new RedisCache({
    redis: new Redis(),
    prefix: 'test2',
    codec: 'raw',
  })

  const mockRes = 'raw test'
  const cf = c.cacheWrapper('fn', fn, 5)
  expect(await cf(100, mockRes)).toBe(mockRes)
  expect(fn).toBeCalledTimes(1)
  await repeatCall(10, async () => {
    const res = await cf(100, mockRes)
    expect(res).toBe(mockRes)
  })
  expect(fn).toBeCalledTimes(1)
})

it('singleflight should works well', async () => {
  const fn = jest.fn(mockFn)
  const c = new RedisCache({
    redis: new Redis(),
    prefix: 'test3',
  })

  const mockRes = { name: 'test', age: 18 }
  const cf = c.cacheWrapper('fn', fn, 5)
  await repeatCall(10, async () => {
    const res = await cf(100, mockRes)
    expect(res).toEqual(mockRes)
  })
  expect(fn).toBeCalledTimes(1)
})

it('cacheFn should works well', async () => {
  const fn = jest.fn(mockFn)
  const c = new RedisCache({
    redis: new Redis(),
    prefix: 'test4',
  })

  const mockRes = { name: 'test', age: 18 }
  const cf = () => c.cacheFn('fn', () => fn(100, mockRes), 5)
  expect(await cf()).toEqual(mockRes)
  await repeatCall(10, async () => {
    const res = await cf()
    expect(res).toEqual(mockRes)
  })
  expect(fn).toBeCalledTimes(1)
})

it('custom codec should works well', async () => {
  const testCodecName = 'testCodec'
  class TestCodec implements Codec {
    name() {
      return testCodecName
    }

    encode<T = any>(data: T): ValueType {
      if (typeof data !== 'object') {
        throw new Error('only support object')
      }
      const tmp: any[] = []
      for (const [k, v] of Object.entries(data)) {
        tmp.push(`${k}-${v}`)
      }
      return tmp.join('|')
    }

    decode<T>(val: ValueType): T {
      const vv = val as string
      const res: any = {}
      const tmpArr = vv.split('|')
      tmpArr.forEach((el) => {
        const tmp = el.split('-')
        res[tmp[0]] = tmp[1]
      })
      return res
    }
  }

  registerCodec(new TestCodec())
  setDefaultCodec(testCodecName)

  const fn = jest.fn(mockFn)
  const c = new RedisCache({
    redis: new Redis(),
    prefix: 'test5',
  })

  const mockRes = { name: 'test' }
  const cf = () => c.cacheFn('fn', () => fn(100, mockRes), 5)
  expect(await cf()).toEqual(mockRes)
  await repeatCall(10, async () => {
    const res = await cf()
    expect(res).toEqual(mockRes)
  })
  expect(fn).toBeCalledTimes(1)

  expect(() => setDefaultCodec(testCodecName)).toThrow()
  expect(() => getCodec('notExists')).toThrow()
  expect(getCodec(testCodecName).name()).toBe(testCodecName)
  expect(getCodec().name()).toBe(testCodecName)
})

it('withPrometheus should works well', async () => {
  const fn = jest.fn(mockFn)
  const c = new RedisCache({
    redis: new Redis(),
    prefix: 'test6',
    withPrometheus: true,
  })

  const cf = c.cacheWrapper('fn', fn, 5)
  expect(await cf(100, null)).toBe(null)
  expect(fn).toBeCalledTimes(1)
  await repeatCall(10, () => cf(100, null))
  expect(fn).toBeCalledTimes(1)

  expect(await register.metrics()).toMatchSnapshot()

  const mockRes2 = { name: 'test2', age: 19 }
  expect(await cf(100, mockRes2)).toEqual(mockRes2)
  expect(fn).toBeCalledTimes(2)
  await repeatCall(10, async () => {
    const res = await cf(100, mockRes2)
    expect(res).toEqual(mockRes2)
  })
  expect(fn).toBeCalledTimes(2)

  expect(await register.metrics()).toMatchSnapshot()
})

it('deleteFnCache should works well', async () => {
  const fn = jest.fn(mockFn)
  const c = new RedisCache({
    redis: new Redis(),
    prefix: 'test7',
  })

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

async function testClean(
  c: RedisCache,
  redis: any,
  isCluster: boolean = false
) {
  const fn = jest.fn(mockFn)
  const cf = c.cacheWrapper('fn', fn, 5)

  const getDbSize = async () => {
    if (!isCluster) {
      return redis.dbsize()
    }

    let total = 0
    for (const node of redis.nodes('master')) {
      total += await node.dbsize()
    }
    return total
  }

  for (let i = 0; i < 10; i++) {
    const mockRes = { name: 'test', age: i }
    await cf(100, mockRes)
  }

  expect(await getDbSize()).toBe(10)
  await c.clean()
  expect(await getDbSize()).toBe(0)

  await redis.set('aa', 'aa', 'ex', 10)

  for (let i = 0; i < 10; i++) {
    const mockRes = { name: 'test', age: i }
    await cf(100, mockRes)
  }

  expect(await getDbSize()).toBe(11)
  await c.clean()
  expect(await getDbSize()).toBe(1)
  await redis.del('aa')

  await c.set('p1:aaa', 'test', 5, 'raw')
  await c.set('p1:bbb', 'test', 5, 'raw')
  await c.set('p2:aaa', 'test', 5, 'raw')
  expect(await getDbSize()).toBe(3)
  await c.clean('p1:*', 10)
  expect(await getDbSize()).toBe(1)
}

it('clean should works well', async () => {
  const redis = new Redis('redis://localhost/5')
  const c = new RedisCache({
    redis,
    prefix: 'test8',
  })

  await testClean(c, redis)

  const cluster = new Redis.Cluster(['redis://localhost:7000/0'])
  const cc = new RedisCache({
    redis: cluster,
    prefix: 'test9',
  })

  await cluster.ping()

  await testClean(cc, cluster, true)
})
