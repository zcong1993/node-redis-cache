import { ValueType } from 'ioredis'

export interface Codec {
  name(): string
  encode<T>(data: T): ValueType
  decode<T>(val: ValueType): T
}

export class DecodeError extends Error {}
