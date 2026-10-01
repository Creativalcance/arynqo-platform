"use client";
import { LText } from "@/lib/i18n/client";

import Link from "@/lib/i18n/link";
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="mx-auto max-w-xl px-6 py-24"><h1 className="text-3xl font-bold"><LText text={"Não foi possível carregar esta página."} /></h1><p role="alert" className="mt-5"><LText text={"Verifica a ligação ou tenta novamente dentro de momentos."} /></p><button onClick={reset} className="mt-6 rounded-full bg-[#07111F] px-6 py-3 text-white"><LText text={"Tentar novamente"} /></button><Link href="/" className="ml-5 underline"><LText text={"Voltar ao início"} /></Link></main>;}
