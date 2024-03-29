import Redis, { Cluster } from 'ioredis'
import { Singleflight } from '@zcong/singleflight'
import { AsyncReturnType } from './type'
import { getCodec } from './codec'
import {
  bindThis,
  ErrorHandler,
  loadPackage,
  noopHandler,
  redisScanDel,
} from './utils'
import { createStat, Stat } from './stat'
import { KeyStringer, combineKeyStringer } from './keyStringer'

export const notFoundPlaceholder = '*'
export type IsNotFound = (val: any) => boolean
export interface Option {
  redis: Redis | Cluster
  prefix: string
  codec?: string
  withPrometheus?: boolean
  notFoundExpire?: number
  isNOtFound?: IsNotFound
  name?: string // metrics label name
}

let promClient: any = undefined

let requestsCounter: any
let hitCounter: any
let errorsCounter: any
let hitNotFoundCacheCounter: any

const defaultIsNotFound = (val: any) => val === null
const defaultOption: Partial<Option> = {
  codec: 'json',
  notFoundExpire: 10,
  isNOtFound: defaultIsNotFound,
  name: 'default',
}

export interface Cacher {
  cacheFn<F extends () => Promise<unknown>>(
    key: string,
    fn: F,
    expire: number,
    codec?: string,
    thisArg?: ThisParameterType<F>
  ): Promise<AsyncReturnType<F>>

  cacheWrapper<T extends (...args: any[]) => Promise<any>>(
    keyPrefix: string,
    fn: T,
    expire: number,
    codec?: string,
    keyStringer?: KeyStringer,
    thisArg?: ThisParameterType<T>
  ): T

  deleteFnCache(
    keyPrefix: string,
    args: any[],
    keyStringer?: KeyStringer
  ): Promise<void>

  get<T = any>(key: string, codec?: string): Promise<[T, boolean]>

  set<T = any>(
    key: string,
    val: T,
    expire: number,
    codec?: string
  ): Promise<void>

  delete(...keys: string[]): Promise<void>

  clean(match?: string, count?: number): Promise<void>
}

export class RedisCache implements Cacher {
  onError: ErrorHandler = noopHandler
  private readonly sf = new Singleflight()
  private stat = createStat()
  constructor(private readonly option: Option) {
    this.option = {
      ...defaultOption,
      ...option,
    }

    if (option.withPrometheus && !promClient) {
      promClient = loadPackage('prom-client', 'withPrometheus', () =>
        require('prom-client')
      )
      this.setupPrometheus()
    }
  }

  async cacheFn<F extends () => Promise<unknown>>(
    key: string,
    fn: F,
    expire: number,
    codec?: string,
    thisArg?: ThisParameterType<F>
  ): Promise<AsyncReturnType<F>> {
    this.incrRequestsCounter(1)
    try {
      const [val, isNOtFound] = await this.get(key, codec)
      // if is not found cache, return null
      if (isNOtFound) {
        this.incrHitCounter(1)
        this.incrHitNotFoundCacheCounter(1)
        return null
      }

      if (val !== null) {
        this.incrHitCounter(1)
        return val
      }
    } catch (err) {
      this.incrErrorsCounter(1)
      this.onError({
        key,
        error: err,
        action: 'get cache',
      })
    }

    const [data, fresh] = await this.sf.doWithFresh(key, async () => {
      const res = await bindThis(fn, thisArg)()
      try {
        await this.set(key, res, expire, codec)
      } catch (err) {
        this.incrErrorsCounter(1)
        this.onError({
          key,
          error: err,
          action: 'set cache',
        })
      }
      return res
    })

    if (!fresh) {
      this.incrHitCounter(1)
    }

    return data as AsyncReturnType<F>
  }

  cacheWrapper<T extends (...args: any[]) => Promise<any>>(
    keyPrefix: string,
    fn: T,
    expire: number,
    codec?: string,
    keyStringer: KeyStringer = combineKeyStringer,
    thisArg?: ThisParameterType<T>
  ): T {
    return ((...args: any[]) => {
      const cacheKey = RedisCache.joinKey(keyPrefix, keyStringer(...args))
      return this.cacheFn(
        cacheKey,
        () => bindThis(fn, thisArg)(...args),
        expire,
        codec
      )
    }) as any as T
  }

  async deleteFnCache(
    keyPrefix: string,
    args: any[],
    keyStringer: KeyStringer = combineKeyStringer
  ) {
    const cacheKey = RedisCache.joinKey(keyPrefix, keyStringer(...args))
    await this.delete(cacheKey)
  }

  /**
   * get data from cache
   * @param key
   * @param codec
   * @returns [val, isNotFound]
   */
  async get<T = any>(key: string, codec?: string): Promise<[T, boolean]> {
    const val = await this.option.redis.get(this.buildKey(key))
    if (val === notFoundPlaceholder) {
      return [null, true]
    }

    if (!val) {
      return [null, false]
    }

    try {
      const vv: T = this.getCodecByName(codec).decode(val)
      return [vv, false]
    } catch (err) {
      // delete invalid cache
      await this.delete(key)
      this.incrErrorsCounter(1)
      this.onError({
        key,
        error: err,
        action: 'decode cache',
      })
      return [null, false]
    }
  }

  async set<T = any>(key: string, val: T, expire: number, codec?: string) {
    if (this.option.isNOtFound(val)) {
      await this.option.redis.set(
        this.buildKey(key),
        notFoundPlaceholder,
        'EX',
        this.option.notFoundExpire
      )
      return
    }
    const vv = this.getCodecByName(codec).encode(val)
    await this.option.redis.set(this.buildKey(key), vv, 'EX', expire)
  }

  async delete(...keys: string[]) {
    if (keys.length === 0) {
      return
    }

    await Promise.all(
      keys.map((key) => this.option.redis.del(this.buildKey(key)))
    )
  }

  async clean(match: string = '*', count: number = 100) {
    const normalizedPatterns = this.buildKey(match)
    if (this.option.redis instanceof Cluster) {
      // get only master nodes to scan for deletion,
      // if we get slave nodes, it would be failed for deletion.
      const nodes = this.option.redis.nodes('master')
      await Promise.all(
        nodes.map((node) => redisScanDel(node, normalizedPatterns, count))
      )
    } else {
      await redisScanDel(this.option.redis as Redis, normalizedPatterns, count)
    }
  }

  getStat(): Stat {
    return {
      ...this.stat,
    }
  }

  resetStat() {
    this.stat = createStat()
  }

  private buildKey(key: string) {
    return RedisCache.joinKey(this.option.prefix, key)
  }

  private getCodecByName(codecName?: string) {
    return getCodec(codecName ?? this.option.codec)
  }

  private setupPrometheus() {
    if (!this.option.withPrometheus) {
      return
    }

    requestsCounter = new promClient.Counter({
      name: 'node_cache_requests_total',
      help: 'Total number of requests to the cache.',
      labelNames: ['name'],
    })

    hitCounter = new promClient.Counter({
      name: 'node_cache_hits_total',
      help: 'Total number of requests to the cache that were a hit.',
      labelNames: ['name'],
    })

    errorsCounter = new promClient.Counter({
      name: 'node_cache_errors_total',
      help: 'Total number of errors to the cache.',
      labelNames: ['name'],
    })

    hitNotFoundCacheCounter = new promClient.Counter({
      name: 'node_cache_hit_not_found_cache_total',
      help: 'Total number of requests to the cache that hit a not found cache.',
      labelNames: ['name'],
    })
  }

  private incrRequestsCounter(val: number) {
    this.stat.requestsCounter++
    this.incrCounter(requestsCounter, val)
  }

  private incrHitCounter(val: number) {
    this.stat.hitCounter++
    this.incrCounter(hitCounter, val)
  }

  private incrErrorsCounter(val: number) {
    this.stat.errorsCounter++
    this.incrCounter(errorsCounter, val)
  }

  private incrHitNotFoundCacheCounter(val: number) {
    this.stat.hitNotFoundCacheCounter++
    this.incrCounter(hitNotFoundCacheCounter, val)
  }

  private incrCounter(counter: any, val: number) {
    if (!counter) {
      return
    }

    counter.inc({ name: this.option.name }, val)
  }

  static joinKey(...keys: string[]) {
    return keys.filter(Boolean).join(':')
  }
}
