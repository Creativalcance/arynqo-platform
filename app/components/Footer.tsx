import Image from "next/image";
import Link from "next/link";
import { complaintsBookUrl, legalLinks } from "@/lib/legal-navigation";

export default function Footer({ onManageCookies }: { onManageCookies: () => void }) {
  return (
    <footer className="border-t border-[#DDE3EA] bg-[#07111F] text-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-4 lg:px-12">
        <div className="md:col-span-2">
          <Link href="/" className="inline-flex">
            <Image
              src="/logo-arynqo.png"
              alt="ARYNQO"
              width={260}
              height={70}
              className="h-auto w-[220px] brightness-0 invert"
            />
          </Link>

          <p className="mt-6 max-w-md leading-relaxed text-blue-100">
            Plataforma inteligente de recrutamento e evolução profissional,
            desenhada para ligar talento, estudantes e empresas.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-white">Plataforma</h3>

          <div className="mt-5 grid gap-3 text-sm text-blue-100">
            <Link href="/vagas" className="hover:text-white">
              Vagas
            </Link>

            <Link href="/registo" className="hover:text-white">
              Criar conta
            </Link>

            <Link href="/login" className="hover:text-white">
              Entrar
            </Link>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-white">ARYNQO</h3>

          <div className="mt-5 grid gap-3 text-sm text-blue-100">
            <span>Estudantes</span>
            <span>Empresas</span>
            <span>Candidaturas</span>
            <span>Matching inteligente</span>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-6 py-6">
        <nav aria-label="Informação legal" className="mx-auto mb-6 flex max-w-7xl flex-wrap justify-center gap-x-7 gap-y-4 text-sm text-blue-100 md:justify-start">
          {legalLinks.map(link => (
            <Link key={link.href} href={link.href} className="transition hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              {link.title}
            </Link>
          ))}
          <a href={complaintsBookUrl} target="_blank" rel="noopener noreferrer" className="transition hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            Livro de Reclamações<span className="sr-only"> (abre num novo separador)</span>
          </a>
          <button type="button" onClick={onManageCookies} className="transition hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            Gerir cookies
          </button>
        </nav>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-center text-sm text-blue-100 md:flex-row">
          <p>
            © {new Date().getFullYear()} ARYNQO. Todos os direitos reservados.
          </p>

          <a
            href="https://www.creativalcance.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium transition hover:text-white"
          >
            Made by CreativAlcance
          </a>
        </div>
      </div>
    </footer>
  );
}