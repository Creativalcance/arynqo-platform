import countryLanguages from './data/country-languages.json';
import { languageOptions, parseLanguage } from './profile-options';

export function countryFlag(code: string): string {
  return /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map(char => char.charCodeAt(0) + 127397)) : '🌐';
}
// Countries are a navigation aid only. Never store them as a language or a match criterion.
export function languageCodesForCountry(country: string): string[] {
  return (countryLanguages as Record<string, string[]>)[country] || [];
}
export function selectProfileLanguage(current: string[], code: string, level: string): string[] {
  const selected = languageOptions.find(option => option.code === code);
  if (!selected) return current;
  return [...current.filter(value => parseLanguage(value).code !== code), `${selected.label}${level ? ` (${level})` : ''}`];
}
