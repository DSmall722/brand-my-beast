import type { Metadata } from "next";
import { LegalStubShell, TermsStubBody } from "@/components/LegalStub";
import { BRAND } from "@/lib/campaign";

export const metadata: Metadata = {
  title: { absolute: `Terms | ${BRAND.name}` },
};

export default function TermsPage() {
  return (
    <LegalStubShell title="Terms of Use" testId="terms-page">
      <TermsStubBody />
    </LegalStubShell>
  );
}
