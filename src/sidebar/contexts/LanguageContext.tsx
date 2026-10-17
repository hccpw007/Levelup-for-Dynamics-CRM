import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { Language, TFunction, TranslationKey, TranslationVars, translate } from '../i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: TFunction;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'levelup-language';

/**
 * Detect the initial language from the browser locale.
 * Chinese locales fall back to Simplified Chinese; everything else uses English.
 */
function detectBrowserLanguage(): Language {
  const browserLanguage =
    typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en';
  return browserLanguage.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

/**
 * Read the synchronously available fallback so the first render does not flash.
 */
function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'zh') {
      return stored;
    }
  } catch (error) {
    console.error('[LanguageContext] Failed to read language from localStorage:', error);
  }

  return detectBrowserLanguage();
}

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  // Load the persisted preference from chrome.storage.local (more persistent than localStorage)
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          const result = await chrome.storage.local.get([STORAGE_KEY]);
          const stored = result[STORAGE_KEY];
          if (stored === 'en' || stored === 'zh') {
            setLanguageState(stored);
          }
        }
      } catch (error) {
        console.error('[LanguageContext] Failed to load language from chrome.storage:', error);
      }
    };

    loadLanguage();
  }, []);

  // Keep the sidebar and popup in sync when the language changes in the other surface
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.onChanged) {
      return;
    }

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== 'local' || !changes[STORAGE_KEY]) {
        return;
      }

      const nextLanguage = changes[STORAGE_KEY].newValue;
      if (nextLanguage === 'en' || nextLanguage === 'zh') {
        setLanguageState(nextLanguage);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);

    try {
      localStorage.setItem(STORAGE_KEY, nextLanguage);
    } catch (error) {
      console.error('[LanguageContext] Failed to save language to localStorage:', error);
    }

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [STORAGE_KEY]: nextLanguage }).catch(error => {
        console.error('[LanguageContext] Failed to save language to chrome.storage:', error);
      });
    }
  }, []);

  const t = useCallback<TFunction>(
    (key: TranslationKey, vars?: TranslationVars) => translate(language, key, vars),
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
