import { supabase } from '@/lib/supabase'

interface TranslationData {
  key: string
  language: string
  text: string[]
}

// Cache for translations
const translationsCache = ref<Map<string, TranslationData[]>>(new Map())
const isLoaded = ref(false)

export const useTranslations = () => {
  const { locale } = useI18n()

  // Load all translations from database
  const loadTranslations = async () => {
    if (isLoaded.value) return

    try {
      const { data, error } = await supabase
        .from('translations')
        .select('key, language, text')

      if (error) {
        console.error('Error loading translations:', error)
        return
      }

      // Group by key
      const grouped = new Map<string, TranslationData[]>()
      for (const row of data || []) {
        const existing = grouped.get(row.key) || []
        existing.push(row)
        grouped.set(row.key, existing)
      }

      translationsCache.value = grouped
      isLoaded.value = true
    } catch (err) {
      console.error('Error in loadTranslations:', err)
    }
  }

  // Translate a value from any language to the current locale
  const translateValue = (key: string, value: string): string => {
    if (!value) return value

    const translations = translationsCache.value.get(key)
    if (!translations || translations.length === 0) return value

    // Find the index of the value in any language
    let valueIndex = -1
    for (const trans of translations) {
      const idx = trans.text.findIndex(
        t => t.toLowerCase() === value.toLowerCase()
      )
      if (idx !== -1) {
        valueIndex = idx
        break
      }
    }

    if (valueIndex === -1) return value // Value not found in any translation

    // Get translation for current locale
    const currentLocale = locale.value || 'en'
    const targetTranslation = translations.find(t => t.language === currentLocale)

    if (targetTranslation && targetTranslation.text[valueIndex]) {
      return targetTranslation.text[valueIndex]
    }

    // Fallback to English
    const englishTranslation = translations.find(t => t.language === 'en')
    if (englishTranslation && englishTranslation.text[valueIndex]) {
      return englishTranslation.text[valueIndex]
    }

    return value // Return original if no translation found
  }

  // Get all values for a key in the current locale
  const getOptions = (key: string): string[] => {
    const translations = translationsCache.value.get(key)
    if (!translations) return []

    const currentLocale = locale.value || 'en'
    const translation = translations.find(t => t.language === currentLocale)
      || translations.find(t => t.language === 'en')

    return translation?.text || []
  }

  // Translate visitor type specifically (convenience method)
  const translateVisitorType = (type: string): string => {
    return translateValue('visitor_type', type)
  }

  return {
    loadTranslations,
    translateValue,
    translateVisitorType,
    getOptions,
    isLoaded: readonly(isLoaded),
  }
}
