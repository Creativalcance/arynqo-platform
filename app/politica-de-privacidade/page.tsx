import type { Metadata } from "next";
import LegalDocumentPage from "@/app/components/LegalDocumentPage";
import { legalDocuments } from "@/lib/legal-documents";

const document = legalDocuments.privacy;

export const metadata: Metadata = {
  title: document.title,
  description: document.description,
  alternates: { canonical: "https://www.arynqo.com/politica-de-privacidade" },
};

export default function Page() {
  return <LegalDocumentPage document={document} />;
}
