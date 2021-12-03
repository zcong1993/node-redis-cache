import { KeyStringer, md5KeyStringer } from './keyStringer'

/**
 * @deprecated use KeyStringer
 */
export type Hasher = KeyStringer
/**
 * @deprecated use md5KeyStringer
 */
export const md5Hasher = md5KeyStringer
