import type { Metadata } from "next";
import {
  LegalStubShell,
  PrivacyStubBody,
} from "@/components/LegalStub";
import { BRAND } from "@/lib/campaign";

export const metadata: Metadata = {
  title: { absolute: `Privacy | ${BRAND.name}` },
};

/** Short real privacy policy. No auction process notes. */
export default function PrivacyPage() {
  return (
    <LegalStubShell title="Privacy" testId="privacy-page">
      <PrivacyStubBody />
    </LegalStubShell>
  );
}
