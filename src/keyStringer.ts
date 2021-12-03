import { createHash } from 'crypto'

const maxKeyLen = 200

export type KeyStringer = (...args: any[]) => string

export const md5KeyStringer: KeyStringer = (...args: any[]) => {
  if (args.length === 0) {
    return ''
  }
  return createHash('md5').update(JSON.stringify(args)).digest('hex')
}

const isSimpleType = (v: any) => {
  return ['string', 'number', 'boolean'].includes(typeof v)
}

/**
 * combineKeyStringer will use origin args (array.join) to build the key when
 *   1. all args is simple type [string, number, boolean]
 *   2. output key length less than 200
 * otherwise it will fallback to md5KeyStringer
 */
export const combineKeyStringer: KeyStringer = (...args: any[]) => {
  if (args.some((v) => !isSimpleType(v))) {
    return md5KeyStringer(...args)
  }

  const key = args.join('|')
  if (key.length > maxKeyLen) {
    return md5KeyStringer(...args)
  }

  return key
}
