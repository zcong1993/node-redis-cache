import { it, expect, describe } from 'vitest'
import { combineKeyStringer, md5KeyStringer } from '../src/keyStringer'

describe('combineKeyStringer', () => {
  it('should works for simple type', () => {
    expect(combineKeyStringer('a', 1, false)).toBe('a|1|false')
  })

  it('should fallback to md5 for other types', () => {
    const args: any[] = ['a', 1, { age: 18 }]
    expect(combineKeyStringer(...args)).toBe(md5KeyStringer(...args))
  })

  it('should fallback when key is too long', () => {
    const args: any[] = ['a'.repeat(199), 1, false]
    expect(combineKeyStringer(...args)).toBe(md5KeyStringer(...args))
  })
})
