import { Codec, ValueType } from './codec'

export class RawCodec implements Codec {
  name() {
    return 'raw'
  }

  encode<T = any>(data: T): ValueType {
    return data as any as ValueType
  }

  decode<T = any>(val: ValueType): T {
    return val as any
  }
}
