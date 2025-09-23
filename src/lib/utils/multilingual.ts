import { LanguageCode, getLanguageFallbackChain, MultilingualText, FALLBACK_LANGUAGE } from '@/lib/constants/languages'

export function getLocalizedText(
  multilingualText: MultilingualText | Record<string, string> | string | null | undefined, 
  language: LanguageCode, 
  fallback: string = ''
): string {
  if (!multilingualText) return fallback
  
  // If it's already a string, return as-is
  if (typeof multilingualText === 'string') {
    try {
      // Try to parse as JSON in case it's a stringified JSON from database
      const parsed = JSON.parse(multilingualText)
      if (typeof parsed === 'object' && parsed !== null) {
        return getLocalizedTextFromObject(parsed, language, fallback)
      }
      return multilingualText
    } catch {
      // If parsing fails, return the string as-is
      return multilingualText
    }
  }
  
  // If it's an object, get the localized text with fallback chain
  if (typeof multilingualText === 'object' && multilingualText !== null) {
    return getLocalizedTextFromObject(multilingualText, language, fallback)
  }
  
  return fallback
}

function getLocalizedTextFromObject(
  textObj: Record<string, string>, 
  language: LanguageCode, 
  fallback: string
): string {
  // Use fallback chain to find the best available translation
  const fallbackChain = getLanguageFallbackChain(language)
  
  for (const lang of fallbackChain) {
    if (textObj[lang] && textObj[lang].trim()) {
      return textObj[lang]
    }
  }
  
  // If no translation found in fallback chain, get first available translation
  const availableTranslations = Object.values(textObj).filter(text => text && text.trim())
  if (availableTranslations.length > 0) {
    return availableTranslations[0]
  }
  
  return fallback
}

export function createMultilingualText(text: string, language: LanguageCode = 'uk'): MultilingualText {
  return { [language]: text }
}

export function updateMultilingualText(
  existing: MultilingualText | string | null, 
  newText: string, 
  language: LanguageCode
): MultilingualText {
  let textObj: MultilingualText = {}
  
  if (typeof existing === 'string') {
    try {
      textObj = JSON.parse(existing)
    } catch {
      // If existing is not JSON, treat it as text in the fallback language
      textObj = { [FALLBACK_LANGUAGE]: existing }
    }
  } else if (existing && typeof existing === 'object') {
    textObj = { ...existing }
  }
  
  textObj[language] = newText
  return textObj
}

// Helper to check if a text has translation for a specific language
export function hasTranslation(
  multilingualText: MultilingualText | Record<string, string> | string | null | undefined,
  language: LanguageCode
): boolean {
  if (!multilingualText) return false
  
  if (typeof multilingualText === 'string') {
    try {
      const parsed = JSON.parse(multilingualText)
      return !!(parsed && parsed[language] && parsed[language].trim())
    } catch {
      return false
    }
  }
  
  if (typeof multilingualText === 'object' && multilingualText !== null) {
    return !!(multilingualText[language] && multilingualText[language].trim())
  }
  
  return false
}

// Get all available languages for a multilingual text
export function getAvailableLanguages(
  multilingualText: MultilingualText | Record<string, string> | string | null | undefined
): LanguageCode[] {
  if (!multilingualText) return []
  
  let textObj: Record<string, string> = {}
  
  if (typeof multilingualText === 'string') {
    try {
      textObj = JSON.parse(multilingualText)
    } catch {
      return []
    }
  } else if (typeof multilingualText === 'object') {
    textObj = multilingualText
  }
  
  return Object.keys(textObj).filter(lang => 
    textObj[lang] && textObj[lang].trim()
  ) as LanguageCode[]
}