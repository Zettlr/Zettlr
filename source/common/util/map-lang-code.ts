/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        mapLangCodeToName, mapLangCodeToFlag, resolveLangCode
 * CVM-Role:        Utility Functions
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains three functions.
 *                  - mapLangCodeToName
 *                    Returns a map of language codes to translated names
 *                  - mapLangCodeToFlag
 *                    Returns a map of language codes to flag emojis
 *                  - resolveLangCode
 *                    Resolves a language code to either a name or a flag
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'

/**
 * Returns a map of language codes to readable language names. NOTE: Only
 * includes country codes if required. I.e.: Does not include sv-SE, since
 * Swedish is only spoken in Sweden, but includes several varieties of `en`
 * (US, UK, Canada, Australia, etc.)
 *
 * @return  {Record<string>}  The map
 */
export function mapLangCodeToName (): Record<string, string> {
  return {
    af: trans('Afrikaans'),
    ar: trans('Arabic'),
    ast: trans('Asturian'),
    be: trans('Belarus'),
    bg: trans('Bulgarian'),
    br: trans('Breton'),
    bs: trans('Bosnian'),
    ca: trans('Catalan'),
    'ca-ES-valencia': trans('Catalan (Valencia)'),
    cs: trans('Czech'),
    da: trans('Danish'),
    'de-AT': trans('German (Austria)'),
    'de-CH': trans('German (Switzerland)'),
    'de-DE-x-simple-language': trans('German (simple)'),
    'de-DE': trans('German (Germany)'),
    'de-LU': trans('German (Luxembourg)'),
    de: trans('German'),
    el: trans('Greek'),
    'en-AU': trans('English (Australia)'),
    'en-CA': trans('English (Canada)'),
    'en-GB': trans('English (United Kingdom)'),
    'en-IN': trans('English (India)'),
    'en-NZ': trans('English (New Zealand)'),
    'en-US': trans('English (United States)'),
    'en-ZA': trans('English (South Africa)'),
    en: trans('English'),
    eo: trans('Esperanto'),
    'es-AR': trans('Spanish (Argentina)'),
    'es-ES': trans('Spanish (Spain)'),
    es: trans('Spanish'),
    et: trans('Estonian'),
    eu: trans('Basque'),
    fa: trans('Persian (Farsi)'),
    fi: trans('Finnish'),
    fo: trans('Faroese'),
    'fr-BE': trans('French (Belgium)'),
    'fr-CH': trans('French (Switzerland)'),
    'fr-FR': trans('French (France)'),
    'fr-LU': trans('French (Luxembourg)'),
    'fr-MC': trans('French (Principality of Monaco)'),
    fr: trans('French'),
    ga: trans('Irish'),
    gd: trans('Scottish (Gaelic)'),
    gl: trans('Galician'),
    he: trans('Hebrew'),
    hi: trans('Hindi'),
    hr: trans('Croatian'),
    hu: trans('Hungarian'),
    hy: trans('Armenian'),
    id: trans('Indonesian'),
    is: trans('Icelandic'),
    'it-CH': trans('Italian (Switzerland)'),
    'it-IT': trans('Italian (Italy)'),
    it: trans('Italian'),
    ja: trans('Japanese'),
    ka: trans('Georgian'),
    kk: trans('Kazakh'),
    km: trans('Khmer (Cambodia)'),
    ko: trans('Korean'),
    la: trans('Latin'),
    'lb-LB': trans('Luxembourgian'),
    lt: trans('Lithuanian'),
    lv: trans('Latvian'),
    mk: trans('Macedonian'),
    mn: trans('Mongolian'),
    'ms-BN': trans('Malaysian (Brunei Darussalam)'),
    'ms-MY': trans('Malaysian (Malaysia)'),
    ms: trans('Malaysian'),
    nb: trans('Norwegian (Bokmål)'),
    ne: trans('Nepalese'),
    'nl-BE': trans('Dutch (Belgium)'),
    'nl-NL': trans('Dutch (Netherlands)'),
    nl: trans('Dutch'),
    nn: trans('Norwegian (Nyorsk)'),
    no: trans('Norwegian'),
    pl: trans('Polish'),
    'pt-AO': trans('Portuguese (Angola)'),
    'pt-BR': trans('Portuguese (Brazil)'),
    'pt-MZ': trans('Portuguese (Mozambique)'),
    'pt-PT': trans('Portuguese (Portugal)'),
    pt: trans('Portuguese'),
    ro: trans('Romanian'),
    ru: trans('Russian'),
    rw: trans('Rwandan (Kinyarwanda)'),
    sk: trans('Slovakian'),
    sl: trans('Slovenian'),
    sr: trans('Serbian'),
    sq: trans('Albanian'),
    'sq-AL': trans('Albanian (Albania)'),
    sv: trans('Swedish'),
    ta: trans('Tamil (India)'),
    th: trans('Thai'),
    tl: trans('Tagalog (Filipino)'),
    tr: trans('Turkish'),
    uk: trans('Ukrainian'),
    ur: trans('Urdu'),
    vi: trans('Vietnamese'),
    // NOTE: According to ISO 639-2, while hsb and dsb denote Higher and Lower
    // Sorbian, wen denotes the language family as such
    wen: trans('Sorbian'),
    'zh-CN': trans('Chinese (China)'),
    'zh-TW': trans('Chinese (Taiwan)'),
    zh: trans('Chinese')
  }
}

/**
 * Returns a map of language codes to emoji flags. NOTE: Only includes country
 * codes if required. I.e.: Does not include sv-SE, since Swedish is only spoken
 * in Sweden, but includes several varieties of `en` (US, UK, Canada, etc.)
 *
 * @return  {Record<string>}  The map
 */
export function mapLangCodeToFlag (): Record<string, string> {
  return {
    af: '🇿🇦',
    ar: '🇦🇪',
    ast: '🇪🇸',
    be: '🇧🇾',
    bg: '🇧🇬',
    br: '🇫🇷',
    bs: '🇧🇦',
    ca: '🇪🇸',
    'ca-ES-valencia': '🇪🇸',
    cs: '🇨🇿',
    da: '🇩🇰',
    'de-AT': '🇦🇹',
    'de-CH': '🇨🇭',
    'de-DE-x-simple-language': '🇩🇪',
    'de-DE': '🇩🇪',
    'de-LU': '🇱🇺',
    de: '🇩🇪',
    el: '🇬🇷',
    'en-AU': '🇦🇺',
    'en-CA': '🇨🇦',
    'en-GB': '🇬🇧',
    'en-IN': '🇮🇳',
    'en-NZ': '🇳🇿',
    'en-US': '🇺🇸',
    'en-ZA': '🇿🇦',
    en: '🇺🇸',
    'es-AR': '🇦🇷',
    'es-ES': '🇪🇸',
    es: '🇪🇸',
    et: '🇪🇪',
    eu: '🇪🇸',
    fa: '🇮🇷',
    fi: '🇫🇮',
    fo: '🇫🇴',
    'fr-BE': '🇧🇪',
    'fr-CH': '🇨🇭',
    'fr-FR': '🇫🇷',
    'fr-LU': '🇱🇺',
    'fr-MC': '🇲🇨',
    fr: '🇫🇷',
    ga: '🇮🇪',
    gd: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    gl: '🇪🇸',
    he: '🇮🇱',
    hi: '🇮🇳',
    hr: '🇭🇷',
    hu: '🇭🇺',
    hy: '🇦🇲',
    id: '🇮🇩',
    is: '🇮🇸',
    'it-CH': '🇨🇭',
    'it-IT': '🇮🇹',
    it: '🇮🇹',
    ja: '🇯🇵',
    ka: '🇬🇪',
    km: '🇰🇭',
    ko: '🇰🇷',
    'lb-LB': '🇱🇺',
    lt: '🇱🇹',
    lv: '🇱🇻',
    mn: '🇲🇳',
    'ms-BN': '🇧🇳',
    'ms-MY': '🇲🇾',
    ms: '🇲🇾',
    nb: '🇳🇴',
    ne: '🇳🇵',
    'nl-BE': '🇧🇪',
    'nl-NL': '🇳🇱',
    nl: '🇳🇱',
    nn: '🇳🇴',
    no: '🇳🇴',
    pl: '🇵🇱',
    'pt-AO': '🇦🇴',
    'pt-BR': '🇧🇷',
    'pt-MZ': '🇲🇿',
    'pt-PT': '🇵🇹',
    pt: '🇵🇹',
    ro: '🇷🇴',
    ru: '🇷🇺',
    rw: '🇷🇼',
    sk: '🇸🇰',
    sl: '🇸🇮',
    'sq-AL': '🇦🇱',
    sr: '🇷🇸',
    sv: '🇸🇪',
    ta: '🇮🇳',
    th: '🇹🇭',
    tl: '🇵🇭',
    tr: '🇹🇷',
    uk: '🇺🇦',
    ur: '🇵🇰',
    vi: '🇻🇳',
    'wen-DE': '🇩🇪',
    'wen-PL': '🇵🇱',
    'zh-CN': '🇨🇳',
    'zh-TW': '🇹🇼',
    zh: '🇨🇳'
  }
}

/**
 * Utilizes the language map to resolve a given code to a translated language
 * name or its flag emoji. NOTE: If you pass in a code with a country code, it
 * may return a name without country specification (e.g., `sv-SE` is mapped to
 * `sv`, since Swedish is only spoken in Sweden). Returns the code itself if not
 * contained in the map.
 *
 * @param   {string}        code  The code (e.g., `sv-SE` or `sv`)
 * @param   {'name'|'flag'} which The map to use (either names or flags)
 *
 * @return  {string}              The resolved name/flag, or code if no match
 */
export function resolveLangCode (code: string, which: 'name'|'flag' = 'name'): string {
  const shortCode = code.split('-')[0]
  const map = (which === 'name') ? mapLangCodeToName() : mapLangCodeToFlag()

  if (code in map) {
    return map[code]
  } else if (shortCode in map) {
    return map[shortCode]
  } else {
    return code
  }
}
