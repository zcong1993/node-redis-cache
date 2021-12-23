import { ValueType } from 'ioredis'
import { Codec, DecodeError } from './codec'

export class JSONCodec implements Codec {
  name() {
    return 'json'
  }

  encode<T = any>(data: T): ValueType {
    return JSON.stringify(data)
  }

  decode<T>(val: ValueType): T {
    /* c8 ignore next 3 */
    if (typeof val !== 'string') {
      throw new DecodeError('not a string')
    }
    return JSON.parse(val)
  }
}
