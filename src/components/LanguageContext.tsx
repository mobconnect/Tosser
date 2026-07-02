import React, { createContext, useContext, useState, useEffect } from 'react';
import { LanguageCode, LANGUAGES, translations } from '../lib/translations';
import { COUNTRIES } from '../lib/countries';

export { LANGUAGES, translations };
export type { LanguageCode };

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  country: string; // Country Code, e.g., 'US', 'FR'
  setCountry: (countryCode: string) => void;
  t: (key: keyof typeof translations['en'], params?: Record<string, any>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>('en');
  const [country, setCountryState] = useState<string>('US');

  useEffect(() => {
    // Detect stored country or default to US
    const storedCountry = localStorage.getItem('tosser_country');
    if (storedCountry) {
      setCountryState(storedCountry);
      // Auto set language based on country if not explicitly overridden by user language preference
      const matched = COUNTRIES.find(c => c.code === storedCountry);
      if (matched && !localStorage.getItem('tosser_language')) {
        setLanguageState(matched.lang);
      }
    } else {
      // Try to estimate country from timezone or browser locale
      const locale = navigator.language || '';
      const parts = locale.split('-');
      const countryFromLocale = parts[1] || parts[0];
      if (countryFromLocale && countryFromLocale.length === 2) {
        const countryUpper = countryFromLocale.toUpperCase();
        const exists = COUNTRIES.some(c => c.code === countryUpper);
        if (exists) {
          setCountryState(countryUpper);
          const matched = COUNTRIES.find(c => c.code === countryUpper);
          if (matched && !localStorage.getItem('tosser_language')) {
            setLanguageState(matched.lang);
          }
        }
      }
    }

    // Explicit user language preference overrides auto-detected language
    const storedLang = localStorage.getItem('tosser_language') as LanguageCode;
    if (storedLang && translations[storedLang]) {
      setLanguageState(storedLang);
    }
  }, []);

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem('tosser_language', lang);
  };

  const setCountry = (countryCode: string) => {
    const matched = COUNTRIES.find(c => c.code === countryCode);
    setCountryState(countryCode);
    localStorage.setItem('tosser_country', countryCode);
    
    // Automatically match language when country is chosen, but user can still change language manually
    if (matched) {
      setLanguage(matched.lang);
    }
  };

  const t = (key: keyof typeof translations['en'], params?: Record<string, any>): string => {
    const translationSet = translations[language] || translations['en'];
    let text = translationSet[key] || translations['en'][key] || String(key);

    if (params) {
      Object.keys(params).forEach((paramKey) => {
        text = text.replace(`{${paramKey}}`, String(params[paramKey]));
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, country, setCountry, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
