import { useState, useEffect, useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { translateText, getGoogleLangCode } from '../utils/translateText';

/**
 * React hook that auto-translates a text string based on current app language.
 *
 * @param {string} text - The original CMS text to translate
 * @returns {{ translatedText: string, isTranslating: boolean }}
 */
export function useAutoTranslate(text) {
  const { language } = useContext(LanguageContext);
  const [translatedText, setTranslatedText] = useState(text || '');
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (!text) {
      setTranslatedText('');
      return;
    }

    // If English, just return original text
    if (language === 'en') {
      setTranslatedText(text);
      return;
    }

    let cancelled = false;
    const targetLang = getGoogleLangCode(language);

    setIsTranslating(true);
    translateText(text, targetLang)
      .then(result => {
        if (!cancelled) setTranslatedText(result);
      })
      .finally(() => {
        if (!cancelled) setIsTranslating(false);
      });

    return () => { cancelled = true; };
  }, [text, language]);

  return { translatedText, isTranslating };
}
