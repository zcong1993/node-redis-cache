import * as Redis from 'ioredis'
import { RedisCache } from '../src'
import { testClean } from './index.test'

it('clean should works well in cluster mode', async () => {
  const cluster = new Redis.Cluster(['redis://localhost:7000/0'])
  const cc = new RedisCache({
    redis: cluster,
    prefix: 'test9',
  })

  await cluster.ping()

  await testClean(cc, cluster, true)
})
