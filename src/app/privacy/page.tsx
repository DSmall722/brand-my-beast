import {
  LegalStubShell,
  PrivacyStubBody,
} from "@/components/LegalStub";

/** Short real privacy policy. No auction process notes. */
export default function PrivacyPage() {
  return (
    <LegalStubShell title="Privacy" testId="privacy-page">
      <PrivacyStubBody />
    </LegalStubShell>
  );
}
