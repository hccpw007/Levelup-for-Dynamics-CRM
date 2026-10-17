// Translation entry point shared by the sidebar and popup UI
import { en, TranslationKey } from './en';
import { zh } from './zh';

export type Language = 'en' | 'zh';

export type TranslationVars = Record<string, string | number>;

export type TFunction = (key: TranslationKey, vars?: TranslationVars) => string;

const dictionaries: Record<Language, Record<TranslationKey, string>> = { en, zh };

/**
 * Resolve a translation and replace {placeholder} tokens with the given values
 */
export function translate(language: Language, key: TranslationKey, vars?: TranslationVars): string {
  let text = dictionaries[language]?.[key] ?? en[key] ?? key;

  if (vars) {
    Object.entries(vars).forEach(([name, value]) => {
      text = text.split(`{${name}}`).join(String(value));
    });
  }

  return text;
}

export { en, zh };
export type { TranslationKey };
