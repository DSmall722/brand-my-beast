import {
  LegalStubShell,
  PrivacyStubBody,
} from "@/components/LegalStub";

/** Slice 7.9 — privacy stub from CAMPAIGN + PUBLIC_COPY only. */
export default function PrivacyPage() {
  return (
    <LegalStubShell title="Privacy" testId="privacy-page">
      <PrivacyStubBody />
    </LegalStubShell>
  );
}
