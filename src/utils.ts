import { debug as d } from 'debug'
import type { default as Redis } from 'ioredis'

/* c8 ignore next 2 */
const MISSING_REQUIRED_DEPENDENCY = (name: string, reason: string) =>
  `The "${name}" package is missing. Please, make sure to install this library ($ npm install ${name}) to take advantage of ${reason}.`

export const loadPackage = (
  packageName: string,
  context: string,
  loaderFn?: Function
) => {
  try {
    return loaderFn ? loaderFn() : require(packageName)
    /* c8 ignore next 4 */
  } catch (e) {
    console.error(MISSING_REQUIRED_DEPENDENCY(packageName, context))
    process.exit(1)
  }
}

export const debug = d('node-redis-cache')

export const redisScanDel = async (
  redis: Redis,
  match: string,
  count: number
) => {
  return new Promise<void>((resolve, reject) => {
    const stream = redis.scanStream({
      match,
      count,
    })

    stream.on('data', (keys: string[] = []) => {
      if (!keys.length) {
        return
      }

      stream.pause()

      debug('redisScanDel delete keys: ', keys)

      // redis.del(keys) will fail in cluster mode
      Promise.all(keys.map((key) => redis.del(key)))
        .then(() => {
          stream.resume()
        })
        /* c8 ignore next 6 */
        .catch((err) => {
          err.match = match
          return reject(err)
        })
    })

    /* c8 ignore next 3 */
    stream.on('error', (err) => {
      reject(err)
    })

    stream.on('end', () => {
      resolve()
    })
  })
}

export const bindThis = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  thisArg?: ThisParameterType<T>
): T => {
  return thisArg == null ? fn : fn.bind(thisArg)
}

export interface ErrorEvent {
  key: string
  error: Error
  action: string
}

export type ErrorHandler = (errorEvent: ErrorEvent) => void

export const noopHandler: ErrorHandler = () => {}
