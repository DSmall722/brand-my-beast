import type { Metadata } from "next";
import { LegalStubShell, TermsStubBody } from "@/components/LegalStub";
import { BRAND, PUBLIC_SITE_ORIGIN } from "@/lib/campaign";

export const metadata: Metadata = {
  title: { absolute: `Terms | ${BRAND.name}` },
  alternates: { canonical: `${PUBLIC_SITE_ORIGIN}/terms` },
};

export default function TermsPage() {
  return (
    <LegalStubShell title="Terms of Use" testId="terms-page">
      <TermsStubBody />
    </LegalStubShell>
  );
}
