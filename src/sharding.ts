import * as HashRing from 'hashring'
import type { Servers } from 'hashring'
import { RedisCache, Hasher, Cacher, md5Hasher } from './cache'
import { debug } from './utils'

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

  async cacheFn<T = any>(
    key: string,
    fn: () => Promise<T>,
    expire: number,
    codec?: string
  ): Promise<T> {
    const node = this.pickNode(key)
    return node.cacheFn(key, fn, expire, codec)
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

  private pickNode(key: string) {
    const nodeKey = this.ring.get(key)
    debug(`pick node, key: ${key}, nodeKey: ${nodeKey}`)
    return this.nodeMap.get(nodeKey)
  }
}
