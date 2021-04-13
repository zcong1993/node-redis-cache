import * as d from 'debug'

const MISSING_REQUIRED_DEPENDENCY = (name: string, reason: string) =>
  `The "${name}" package is missing. Please, make sure to install this library ($ npm install ${name}) to take advantage of ${reason}.`

export const loadPackage = (
  packageName: string,
  context: string,
  loaderFn?: Function
) => {
  try {
    return loaderFn ? loaderFn() : require(packageName)
  } catch (e) {
    console.error(MISSING_REQUIRED_DEPENDENCY(packageName, context))
    process.exit(1)
  }
}

export const debug = d('node-redis-cache')
