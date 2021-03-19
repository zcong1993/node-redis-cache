import { Codec } from './codec'
import { JSONCodec } from './json'
import { RawCodec } from './raw'

let defaultCodec: string = 'json'

let defaultSetted: boolean = false

const codecMap = new Map<string, Codec>()

export const registerCodec = (codec: Codec) => {
  codecMap.set(codec.name(), codec)
}

export const setDefaultCodec = (codec: string) => {
  if (defaultSetted) {
    throw new Error('default codec can only set once')
  }

  defaultCodec = codec
  defaultSetted = true
}

registerCodec(new RawCodec())
registerCodec(new JSONCodec())

export const getCodec = (name?: string) => {
  if (!name) {
    return codecMap.get(defaultCodec)
  }

  if (!codecMap.has(name)) {
    throw new Error('codec not registered')
  }

  return codecMap.get(name)
}
