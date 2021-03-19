import { createHash } from 'crypto'
import { EventEmitter } from 'events'
import { Singleflight } from '@zcong/singleflight'
import { Redis } from 'ioredis'
import { getCodec } from './codec'
import IORedis = require('ioredis')

export interface Option {
  redis: Redis
  prefix: string
  codec?: string
}

export type Hasher = (...args: any[]) => string

export const md5Hasher: Hasher = (...args: any[]) => {
  return createHash('md5').update(JSON.stringify(args)).digest('hex')
}

export class RedisCache extends EventEmitter {
  private readonly sf = new Singleflight()
  constructor(private readonly option: Option) {
    super()
    if (!this.option.codec) {
      this.option.codec = 'json'
    }
  }

  async cacheFn<T = any>(
    key: string,
    fn: () => Promise<T>,
    expire: number,
    codec?: string
  ): Promise<T> {
    try {
      const cached = await this.get(key, codec)
      if (cached !== null) {
        return cached
      }
    } catch (err) {
      this.emit('error', {
        key,
        error: err,
        action: 'get cache',
      })
    }

    return this.sf.do(key, async () => {
      const res = await fn()
      try {
        await this.set(key, res, expire, codec)
      } catch (err) {
        this.emit('error', {
          key,
          error: err,
          action: 'set cache',
        })
      }
      return res
    })
  }

  cacheWrapper<T extends (...args: any[]) => Promise<any>>(
    keyPrefix: string,
    fn: T,
    expire: number,
    codec?: string,
    keyHasher: Hasher = md5Hasher
  ): T {
    return (((...args: any[]) => {
      const cacheKey = RedisCache.joinKey(keyPrefix, keyHasher(...args))
      return this.cacheFn(cacheKey, () => fn(...args), expire, codec)
    }) as any) as T
  }

  async get<T = any>(key: string, codec?: string): Promise<T> {
    const val = await this.option.redis.get(this.buildKey(key))
    if (!val) {
      return null
    }
    return this.getCodecByName(codec).decode(val)
  }

  async set<T = any>(key: string, val: T, expire: number, codec?: string) {
    const vv = this.getCodecByName(codec).encode(val)
    await this.option.redis.set(this.buildKey(key), vv, 'ex', expire)
  }

  async delete(key: string) {
    await this.option.redis.del(this.buildKey(key))
  }

  private buildKey(key: string) {
    return RedisCache.joinKey(this.option.prefix, key)
  }

  private getCodecByName(codecName?: string) {
    return getCodec(codecName ?? this.option.codec)
  }

  private static joinKey(...keys: string[]) {
    return keys.join(':')
  }
}

const main = async () => {
  const redis = new IORedis()
  const cc = new RedisCache({
    redis,
    prefix: 'test',
  })

  const sleep = (n: number) => new Promise((r) => setTimeout(r, n))

  const res = await Promise.all(
    Array(10)
      .fill(null)
      .map(() =>
        cc.cacheFn(
          'test111',
          async () => {
            console.log('inner')
            await sleep(1000)
            return {
              name: 'zcong',
              age: 18,
            }
          },
          10
        )
      )
  )

  console.log(res)

  const fn = async (name: string, age: number) => {
    await sleep(1000)
    return `${name}:${age}`
  }

  const fn2 = cc.cacheWrapper('fn', fn, 10, 'raw')

  const res2 = await Promise.all(
    Array(10)
      .fill(null)
      .map(() => fn2('test', 18))
  )

  console.log(res2)
}

main()
