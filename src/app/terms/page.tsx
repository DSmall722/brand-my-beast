import { LegalStubShell, TermsStubBody } from "@/components/LegalStub";

/** Slice 7.9 — terms stub from CAMPAIGN + PUBLIC_COPY only. */
export default function TermsPage() {
  return (
    <LegalStubShell title="Terms" testId="terms-page">
      <TermsStubBody />
    </LegalStubShell>
  );
}
