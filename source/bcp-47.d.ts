// Declare the bcp-47 module type definitions
interface Schema {
  language?: string
  extendedLanguageSubtags?: string
  script?: string
  region?: string
  variants?: string
  extensions?: any[]
  privateuse?: string[]
  regular?: 'art-lojban'|'cel-gaulish'|'no-bok'|'no-nyn'|'zh-guoyu'|'zh-hakka'|'zh-min'|'zh-min-nan'|'zh-xiang'
  irregular?: 'en-GB-oed'|'i-ami'|'i-bnn'|'i-default'|'i-enochian'|'i-hak'|'i-klingon'|'i-lux'|'i-mingo'|'i-navajo'|'i-pwn'|'i-tao'|'i-tay'|'i-tsu'|'sgn-BE-FR'|'sgn-BE-NL'|'sgn-CH-DE'
}

interface bcp47Options {
  normalize?: boolean
  forgiving?: boolean
  warning?: Function
}

declare module 'bcp-47' {
  export function parse (tag: string, options?: bcp47Options): Schema
}
