import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import LegalDocumentPage from "@/app/components/LegalDocumentPage";
import { legalDocuments } from "@/lib/legal-documents";

const document = legalDocuments.cookies;

export async function generateMetadata(): Promise<Metadata> { return pageMetadata(document.title, document.description, "/politica-de-cookies"); }

export default function Page() {
  return <LegalDocumentPage document={document} />;
}
