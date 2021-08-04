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
    if (typeof val !== 'string') {
      /* istanbul ignore next */
      throw new DecodeError('not a string')
    }
    return JSON.parse(val)
  }
}
