import * as HashRing from 'hashring'
import type { Servers } from 'hashring'
import { AsyncReturnType } from 'type-fest'
import { RedisCache, Cacher } from './cache'
import { bindThis, debug } from './utils'
import { Hasher, md5Hasher } from './hasher'

export interface Node {
  key: string
  redisCache: RedisCache
  weight: number
}

export interface ShardingOption {
  nodes: Node[]
}

export class ShardingCache implements Cacher {
  private nodeMap = new Map<string, RedisCache>()
  private ring: HashRing

  constructor(option: ShardingOption) {
    const servers: Servers = {}
    for (const node of option.nodes) {
      this.nodeMap.set(node.key, node.redisCache)
      servers[node.key] = { weight: node.weight }
    }
    this.ring = new HashRing(servers)
  }

  async cacheFn<F extends () => Promise<unknown>>(
    key: string,
    fn: F,
    expire: number,
    codec?: string,
    thisArg?: ThisParameterType<F>
  ): Promise<AsyncReturnType<F>> {
    const node = this.pickNode(key)
    return node.cacheFn(key, fn, expire, codec, thisArg)
  }

  cacheWrapper<T extends (...args: any[]) => Promise<any>>(
    keyPrefix: string,
    fn: T,
    expire: number,
    codec?: string,
    keyHasher: Hasher = md5Hasher,
    thisArg?: ThisParameterType<T>
  ): T {
    return (((...args: any[]) => {
      const cacheKey = RedisCache.joinKey(keyPrefix, keyHasher(...args))
      return this.cacheFn(
        cacheKey,
        () => bindThis(fn, thisArg)(...args),
        expire,
        codec
      )
    }) as any) as T
  }

  async deleteFnCache(
    keyPrefix: string,
    args: any[],
    keyHasher: Hasher = md5Hasher
  ) {
    const cacheKey = RedisCache.joinKey(keyPrefix, keyHasher(...args))
    await this.delete(cacheKey)
  }

  async get<T = any>(key: string, codec?: string): Promise<[T, boolean]> {
    const node = this.pickNode(key)
    return node.get(key, codec)
  }

  async set<T = any>(key: string, val: T, expire: number, codec?: string) {
    const node = this.pickNode(key)
    await node.set(key, val, expire, codec)
  }

  async delete(...keys: string[]) {
    await Promise.all(
      keys.map((key) => {
        const node = this.pickNode(key)
        return node.delete(key)
      })
    )
  }

  async clean(match: string = '*', count: number = 100) {
    await Promise.all(
      [...this.nodeMap.values()].map((node) => node.clean(match, count))
    )
  }

  private pickNode(key: string) {
    const nodeKey = this.ring.get(key)
    debug(`pick node, key: ${key}, nodeKey: ${nodeKey}`)
    return this.nodeMap.get(nodeKey)
  }
}
