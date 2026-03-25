import { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { getTranslation } from '../utils/translations';

export const useTranslation = () => {
  const { language } = useContext(LanguageContext);
  
  const t = (key) => {
    return getTranslation(key, language);
  };
  
  return { t, language };
};
