import occupations from '@/lib/data/occupations.json';
import type {Locale} from '@/lib/i18n/config';
import {optionKey} from '@/lib/profile-options';
export function occupationName(value:unknown):string|null{
 if(typeof value!=='string'||/[<>\p{Cc}\p{Cf}]/u.test(value))return null;
 const label=value.normalize('NFC').replace(/\s+/g,' ').trim();
 return label.length>=2&&label.length<=150&&/\p{L}/u.test(label)?label:null;
}
export function officialExact(label:string,locale:Locale){
 const key=optionKey(label);
 return occupations.filter(o=>Object.values(o.labels).some(v=>optionKey(v)===key)).map(o=>({id:o.id,label:o.labels[locale]}));
}
export function officialSearch(query:string,locale:Locale,id:string|null=null){
 const key=optionKey(query),terms=key.split(' ').filter(Boolean);
 return occupations.filter(o=>id?o.id===id:terms.every(term=>optionKey(o.labels[locale]).includes(term))||terms.every(term=>optionKey(o.labels.en).includes(term))).map(o=>({id:o.id,label:o.labels[locale]})).sort((a,b)=>Number(optionKey(b.label).startsWith(key))-Number(optionKey(a.label).startsWith(key))||a.label.localeCompare(b.label,locale));
}
