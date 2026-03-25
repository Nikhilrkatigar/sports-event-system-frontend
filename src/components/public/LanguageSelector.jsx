import { useContext } from 'react';
import { LanguageContext } from '../../context/LanguageContext';
import { useTranslation } from '../../hooks/useTranslation';

export default function LanguageSelector() {
  const { language, changeLanguage } = useContext(LanguageContext);
  const { t } = useTranslation();

  return (
    <div className="relative group">
      <button
        className="px-3 py-2 rounded-lg text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-900/10 dark:hover:bg-white/20 transition-colors flex items-center gap-2"
        title={t('language')}
      >
        <span className="text-lg">🌐</span>
        <span className="hidden sm:inline uppercase font-semibold">{language === 'en' ? 'EN' : 'KA'}</span>
      </button>
      
      {/* Dropdown Menu */}
      <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-max border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => changeLanguage('en')}
          className={`block w-full text-left px-4 py-2 text-sm font-medium transition-colors rounded-t-lg ${
            language === 'en' 
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold' 
              : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
          }`}
        >
          🇬🇧 {t('english')}
        </button>
        <button
          onClick={() => changeLanguage('ka')}
          className={`block w-full text-left px-4 py-2 text-sm font-medium transition-colors rounded-b-lg ${
            language === 'ka' 
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold' 
              : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
          }`}
        >
          🇮🇳 {t('kannada')}
        </button>
      </div>
    </div>
  );
}
