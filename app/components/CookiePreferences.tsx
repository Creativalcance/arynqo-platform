"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  getCookiePreferencesSnapshot, getServerCookiePreferencesSnapshot,
  saveNecessaryStoragePreference, SERVER_COOKIE_SNAPSHOT, subscribeCookiePreferences,
} from "@/lib/cookie-preferences-store";

const buttonStyle = "rounded-full border border-[#07111F] px-5 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1683FF]";

export default function CookiePreferences({ open, onOpen, onClose }: { open: boolean; onOpen: () => void; onClose: () => void }) {
  const preference = useSyncExternalStore(subscribeCookiePreferences, getCookiePreferencesSnapshot, getServerCookiePreferencesSnapshot);
  const dialog = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    else if (!open && element.open) element.close();
  }, [open]);

  function save() {
    const persisted = saveNecessaryStoragePreference();
    setMessage(persisted ? "" : "Não foi possível guardar esta preferência no navegador. Foi registada apenas para esta visita; o aviso poderá voltar a aparecer.");
    onClose();
  }

  return (
    <>
      {preference === null && !open ? (
        <section aria-labelledby="cookie-notice-title" aria-describedby="cookie-notice-description" className="fixed inset-x-0 bottom-0 z-50 max-h-[75dvh] overflow-y-auto border-t border-[#DDE3EA] bg-white px-6 py-6 shadow-[0_-12px_40px_rgba(7,17,31,0.12)] md:p-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <h2 id="cookie-notice-title" className="text-lg font-bold text-[#07111F]">Cookies e privacidade</h2>
              <p id="cookie-notice-description" className="mt-2 text-sm leading-6 text-slate-600">A ARYNQO utiliza armazenamento necessário para manter a sua sessão e recordar a leitura deste aviso. Atualmente, não utilizamos cookies de estatísticas ou publicidade.</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Consulte a <Link href="/politica-de-cookies" className="font-medium text-[#126BD1] underline underline-offset-4">Política de Cookies</Link> e a <Link href="/politica-de-privacidade" className="font-medium text-[#126BD1] underline underline-offset-4">Política de Privacidade</Link>.</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <button type="button" onClick={save} className={`${buttonStyle} bg-[#07111F] text-white hover:bg-[#1683FF]`}>Continuar com os necessários</button>
              <button type="button" onClick={onOpen} className={`${buttonStyle} bg-white text-[#07111F] hover:border-[#1683FF] hover:text-[#126BD1]`}>Ver preferências</button>
            </div>
          </div>
        </section>
      ) : null}

      {preference !== SERVER_COOKIE_SNAPSHOT && message ? <p role="status" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-2xl border border-[#DDE3EA] bg-white p-5 text-sm leading-6 text-slate-600 shadow-lg">{message}<button type="button" onClick={() => setMessage("")} className="ml-3 font-semibold text-[#126BD1] underline">Fechar</button></p> : null}

      <dialog ref={dialog} aria-labelledby="cookie-preferences-title" aria-describedby="cookie-preferences-description" onCancel={onClose} onClose={onClose} className="m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-hidden rounded-[28px] border border-[#DDE3EA] bg-white p-0 text-[#07111F] shadow-2xl backdrop:bg-[#07111F]/50">
        <div className="flex max-h-[85dvh] flex-col">
        <div className="flex shrink-0 items-start justify-between gap-4 px-6 pb-4 pt-6 md:px-8 md:pt-8">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#126BD1]">ARYNQO</p><h2 id="cookie-preferences-title" className="mt-3 text-2xl font-bold tracking-tight">Preferências de cookies</h2></div>
          <button type="button" onClick={onClose} aria-label="Fechar preferências de cookies" className="rounded-full border border-[#DDE3EA] px-3 py-2 text-sm hover:bg-slate-50">Fechar</button>
        </div>
        <div className="min-h-0 overflow-y-auto px-6 md:px-8">
        <p id="cookie-preferences-description" className="mt-5 text-sm leading-6 text-slate-600">Atualmente, a ARYNQO utiliza apenas armazenamento necessário. Não existem cookies opcionais para ativar ou desativar.</p>
        <div className="mt-6 divide-y divide-[#DDE3EA]">
          <section className="pb-5"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Necessários</h3><span className="text-xs font-semibold text-[#126BD1]">Sempre ativos</span></div><p className="mt-2 text-sm leading-6 text-slate-600">Permitem a autenticação e a manutenção da sessão. A leitura deste aviso é recordada neste navegador durante 180 dias. Pode eliminar esse registo nas definições do navegador.</p></section>
          <section className="py-5"><h3 className="font-semibold">Estatísticas</h3><p className="mt-2 text-sm leading-6 text-slate-600">Não utilizamos ferramentas de medição de navegação através de cookies opcionais.</p></section>
          <section className="py-5"><h3 className="font-semibold">Publicidade</h3><p className="mt-2 text-sm leading-6 text-slate-600">Não utilizamos cookies publicitários nem rastreadores de marketing.</p></section>
        </div>
        <p className="text-sm leading-6 text-slate-600">Se estas tecnologias forem introduzidas, será solicitada uma escolha antes da sua ativação. <Link href="/politica-de-cookies" onClick={onClose} className="font-medium text-[#126BD1] underline underline-offset-4">Consultar a Política de Cookies</Link>.</p>
        </div>
        <div className="shrink-0 border-t border-[#DDE3EA] bg-white p-6 md:px-8">
          <button type="button" onClick={save} className={`${buttonStyle} w-full bg-[#07111F] text-white hover:bg-[#1683FF]`}>Guardar e continuar com os necessários</button>
        </div>
        </div>
      </dialog>
    </>
  );
}
