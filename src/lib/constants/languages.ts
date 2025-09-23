// Supported languages configuration
export const SUPPORTED_LANGUAGES = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    direction: 'ltr'
  },
  uk: {
    code: 'uk',
    name: 'Ukrainian',
    nativeName: 'Українська',
    flag: '🇺🇦',
    direction: 'ltr'
  }
  // Easy to add more languages:
  // fr: {
  //   code: 'fr',
  //   name: 'French',
  //   nativeName: 'Français',
  //   flag: '🇫🇷',
  //   direction: 'ltr'
  // }
} as const

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES
export type LanguageInfo = typeof SUPPORTED_LANGUAGES[LanguageCode]

export const DEFAULT_LANGUAGE: LanguageCode = 'uk'
export const FALLBACK_LANGUAGE: LanguageCode = 'en'

// Get ordered list of language codes for fallback chain
export function getLanguageFallbackChain(primaryLang: LanguageCode): LanguageCode[] {
  const chain = [primaryLang]
  
  if (primaryLang !== FALLBACK_LANGUAGE) {
    chain.push(FALLBACK_LANGUAGE)
  }
  
  // Add other languages as final fallbacks
  Object.keys(SUPPORTED_LANGUAGES).forEach(lang => {
    const langCode = lang as LanguageCode
    if (!chain.includes(langCode)) {
      chain.push(langCode)
    }
  })
  
  return chain
}

// Type for multilingual text objects
export type MultilingualText = Partial<Record<LanguageCode, string>>