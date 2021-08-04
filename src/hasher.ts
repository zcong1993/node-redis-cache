import { createHash } from 'crypto'

export type Hasher = (...args: any[]) => string

export const md5Hasher: Hasher = (...args: any[]) => {
  if (args.length === 0) {
    return ''
  }
  return createHash('md5').update(JSON.stringify(args)).digest('hex')
}
