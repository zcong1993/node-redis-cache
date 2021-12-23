import { it, expect, vi } from 'vitest'
import Redis from 'ioredis'
import { RedisCache } from '../src'

const mockFn = async <T>(n: number, val: T) =>
  new Promise((r) => {
    setTimeout(() => r(val), n)
  })

async function testClean(
  c: RedisCache,
  redis: any,
  isCluster: boolean = false
) {
  const fn = vi.fn(mockFn)
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

it('clean should works well in cluster mode', async () => {
  const cluster = new Redis.Cluster(['redis://localhost:7000/0'])
  const cc = new RedisCache({
    redis: cluster,
    prefix: 'test9',
  })

  await cluster.ping()

  await testClean(cc, cluster, true)
})
