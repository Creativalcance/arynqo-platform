"use client";
import Link from "next/link";
import {useState} from "react";
import {supabase} from "@/lib/supabase";
export default function Page(){
 const [email,setEmail]=useState("");const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 async function submit(e:React.FormEvent){e.preventDefault();if(busy)return;setBusy(true);try{const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:`${window.location.origin}/auth/recuperar`});setMessage(error?"Não foi possível pedir o email. Aguarda e tenta novamente.":"Se existe uma conta com este endereço, receberás um email para recuperar o acesso. Verifica também o spam.");}catch{setMessage("Não foi possível ligar ao serviço.");}finally{setBusy(false);}}
 return <main className="mx-auto max-w-md px-6 py-20"><h1 className="text-3xl font-bold">Recuperar acesso</h1><p className="mt-4">Enviamos uma ligação para definires uma nova palavra-passe.</p><form onSubmit={submit} className="mt-6 space-y-4"><label htmlFor="recovery-email">Email</label><input id="recovery-email" autoComplete="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-xl border p-3"/><button disabled={busy} className="rounded-full bg-[#07111F] px-6 py-3 text-white">{busy?"A pedir email…":"Pedir email de recuperação"}</button></form><p role="status" className="mt-5">{message}</p><Link href="/login" className="mt-5 inline-block underline">Voltar ao login</Link></main>;
}
