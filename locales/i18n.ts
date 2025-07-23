import en from './en.json';
import ru from './ru.json';

type Translations = typeof en;

const locales: Record<string, Translations> = {
  en,
  ru,
};

let currentLocale: string = "en";
let translations: Translations = en;

export function setLocale(locale: string) {
  currentLocale = locale in locales ? locale : "en";
  translations = locales[currentLocale];
}

export function t(key: keyof Translations): string {
  return translations[key] || key;
}