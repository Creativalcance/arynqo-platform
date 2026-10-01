
import { LText } from "@/lib/i18n/client";
import { companyLaunchOfferActive } from "@/lib/company-plan";

export default function CompanyLaunchOffer() {
  if (!companyLaunchOfferActive) return null;
  return <p className="mb-6 rounded-2xl border border-[#1683FF]/20 bg-[#1683FF]/5 p-4 text-sm leading-6 text-[#07111F]">
    <LText text={"Oferta de lançamento: recursos Premium gratuitos, sem cobrança. A identidade e os contactos de cada candidato só ficam disponíveis após aceitar o teu pedido ou candidatar-se a uma vaga da tua empresa."} /></p>;
}
