import { Redis } from 'ioredis'
import { createHash } from 'crypto'
import { Singleflight } from '@zcong/singleflight'
import { getCodec } from './codec'

export interface Option {
  redis: Redis
  prefix: string
  codec?: string
}

export type Hasher = (...args: any[]) => string

export const md5Hasher: Hasher = (...args: any[]) => {
  return createHash('md5').update(JSON.stringify(args)).digest('hex')
}

export interface ErrorEvent {
  key: string
  error: Error
  action: string
}

export type ErrorHandler = (errorEvent: ErrorEvent) => void
const noopHandler: ErrorHandler = () => {}

export class RedisCache {
  onError: ErrorHandler = noopHandler
  private readonly sf = new Singleflight()
  constructor(private readonly option: Option) {
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
      this.onError({
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
        this.onError({
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
