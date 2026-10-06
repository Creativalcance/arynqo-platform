import { notFound } from 'next/navigation';
import { getT } from '@/lib/i18n/server';
import ExternalJobClient from './ExternalJobClient';
export async function generateMetadata(){const t=await getT();return {title:{absolute:t('Vaga externa')+' | ARYNQO'},robots:{index:false,follow:false},referrer:'no-referrer' as const};}
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))notFound();return <ExternalJobClient id={id} />;}
