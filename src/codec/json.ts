import { Codec, DecodeError, ValueType } from './codec'

export class JSONCodec implements Codec {
  name() {
    return 'json'
  }

  encode<T = any>(data: T): ValueType {
    return JSON.stringify(data)
  }

  decode<T>(val: ValueType): T {
    if (typeof val !== 'string') {
      /* c8 ignore next */
      throw new DecodeError('not a string')
    }
    return JSON.parse(val)
  }
}
