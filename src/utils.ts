import * as d from 'debug'
import type { Redis } from 'ioredis'

/* istanbul ignore next */
const MISSING_REQUIRED_DEPENDENCY = (name: string, reason: string) =>
  `The "${name}" package is missing. Please, make sure to install this library ($ npm install ${name}) to take advantage of ${reason}.`

export const loadPackage = (
  packageName: string,
  context: string,
  loaderFn?: Function
) => {
  try {
    return loaderFn ? loaderFn() : require(packageName)
  } catch (e) /* istanbul ignore next */ {
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
        .catch(
          /* istanbul ignore next */ (err) => {
            err.match = match
            return reject(err)
          }
        )
    })

    stream.on('error', (err) => /* istanbul ignore next */ {
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
