// In-memory cache for translated text
const translationCache = new Map();

/**
 * Translate text using the free Google Translate API.
 * Results are cached in memory to avoid redundant requests.
 *
 * @param {string} text - The text to translate
 * @param {string} targetLang - Target language code (e.g. 'kn' for Kannada)
 * @param {string} sourceLang - Source language code (default 'auto' for auto-detect)
 * @returns {Promise<string>} Translated text, or original text on failure
 */
export async function translateText(text, targetLang = 'kn', sourceLang = 'auto') {
  if (!text || typeof text !== 'string' || !text.trim()) return text;

  // Don't translate if target is English (original content language)
  if (targetLang === 'en') return text;

  const cacheKey = `${sourceLang}:${targetLang}:${text}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Translation API error: ${response.status}`);

    const data = await response.json();

    // The API returns an array of arrays; concatenate all translated segments
    const translated = data[0]
      ?.map(segment => segment[0])
      .filter(Boolean)
      .join('') || text;

    translationCache.set(cacheKey, translated);
    return translated;
  } catch (err) {
    console.warn('Auto-translation failed, returning original text:', err.message);
    return text;
  }
}

/**
 * Map our app's language codes to Google Translate language codes.
 */
export function getGoogleLangCode(appLangCode) {
  const langMap = {
    en: 'en',
    ka: 'kn' // our app uses 'ka' for Kannada, Google uses 'kn'
  };
  return langMap[appLangCode] || 'en';
}

/**
 * Clear the translation cache (useful if CMS content is updated).
 */
export function clearTranslationCache() {
  translationCache.clear();
}
