import type { Metadata } from "next";
import LegalDocumentPage from "@/app/components/LegalDocumentPage";
import { legalDocuments } from "@/lib/legal-documents";

const document = legalDocuments.cookies;

export const metadata: Metadata = {
  title: document.title,
  description: document.description,
};

export default function Page() {
  return <LegalDocumentPage document={document} />;
}
