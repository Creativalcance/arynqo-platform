import Link from "next/link";
import { legalLinks } from "@/lib/legal-navigation";
import type { LegalDocument } from "@/lib/legal-documents";

// Render trusted policy copy as text, without injecting HTML.
function PolicyParagraph({ text }: { text: string }) {
  return text.split(/(https:\/\/[^\s;]+|info@creativalcance\.com)/g).map((part, index) => {
    if (part === "info@creativalcance.com") {
      return <a key={index} href={`mailto:${part}`} className="break-words font-medium text-[#126BD1] underline decoration-blue-200 underline-offset-4 hover:decoration-blue-600">{part}</a>;
    }
    if (part.startsWith("https://")) {
      const href = part.replace(/[.,)]+$/, "");
      const punctuation = part.slice(href.length);
      return <span key={index}><a href={href} target="_blank" rel="noopener noreferrer" className="break-words font-medium text-[#126BD1] underline decoration-blue-200 underline-offset-4 hover:decoration-blue-600">{href}</a>{punctuation}</span>;
    }
    return part;
  });
}

export default function LegalDocumentPage({ document }: { document: LegalDocument }) {
  return (
    <main id="inicio-documento" className="bg-[#F7F9FC] text-[#07111F]">
      <section className="border-b border-[#DDE3EA] bg-gradient-to-b from-white to-[#F7F9FC]">
        <div className="mx-auto max-w-7xl px-6 py-14 md:py-20 lg:px-12">
          <Link href="/" className="inline-flex text-sm font-medium text-[#126BD1] hover:underline">Voltar ao início</Link>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-[#126BD1]">ARYNQO</p>
          <h1 className="mt-4 text-4xl font-black leading-tight tracking-[-0.05em] md:text-5xl">{document.title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-600">{document.description}</p>
          <p className="mt-6 text-sm text-slate-500">Versão 1.0 · Última atualização: <time dateTime="2026-09-30">{document.updatedAt}</time></p>
          <nav aria-label="Documentos legais" className="mt-8 flex flex-wrap gap-3">
            {legalLinks.map(link => (
              <Link key={link.href} href={link.href} aria-current={document.href === link.href ? "page" : undefined}
                className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1683FF] ${document.href === link.href ? "border-[#07111F] bg-[#07111F] text-white" : "border-[#DDE3EA] bg-white text-[#07111F] hover:border-[#1683FF] hover:text-[#126BD1]"}`}>
                {link.title}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl items-start gap-8 px-6 py-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-12 lg:py-14">
        <aside className="rounded-3xl border border-[#DDE3EA] bg-white p-6 lg:sticky lg:top-28">
          <nav aria-label="Índice do documento">
            <h2 className="text-base font-bold">Neste documento</h2>
            <ol className="mt-5 space-y-3">
              {document.sections.map(section => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="flex gap-3 text-sm leading-relaxed text-slate-600 hover:text-[#126BD1] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1683FF]">
                    <span className="min-w-5 font-semibold text-[#126BD1]">{section.number}.</span><span>{section.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article aria-label={document.title} className="min-w-0 rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-sm md:p-10 lg:p-12">
          {document.sections.map(section => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-titulo`} className="scroll-mt-28 border-b border-[#DDE3EA] py-8 first:pt-0 last:border-0 last:pb-0">
              <h2 id={`${section.id}-titulo`} className="text-xl font-bold leading-snug tracking-[-0.02em] md:text-2xl">{section.number}. {section.title}</h2>
              <div className="mt-5 space-y-4 text-base leading-8 text-slate-600">
                {section.paragraphs.map((paragraph, index) => <p key={index}><PolicyParagraph text={paragraph} /></p>)}
              </div>
            </section>
          ))}
          <a href="#inicio-documento" className="mt-10 inline-flex text-sm font-semibold text-[#126BD1] hover:underline">Voltar ao topo</a>
        </article>
      </div>
    </main>
  );
}
