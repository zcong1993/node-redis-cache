import { Codec } from './codec'
import { JSONCodec } from './json'
import { RawCodec } from './raw'

let defaultCodec: Codec = new JSONCodec()

let defaultSetted: boolean = false

const codecMap = new Map<string, Codec>()

export const registerCodec = (codec: Codec) => {
  codecMap.set(codec.name(), codec)
}

export const setDefaultCodec = (codec: Codec) => {
  if (defaultSetted) {
    throw new Error('default codec can only set once')
  }

  defaultCodec = codec
  defaultSetted = true
}

registerCodec(new RawCodec())

console.log(codecMap)

export const getCodec = (name?: string) => {
  if (!name) {
    return defaultCodec
  }

  if (!codecMap.has(name)) {
    throw new Error('codec not registered')
  }

  return codecMap.get(name)
}
