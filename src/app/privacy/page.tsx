import type { Metadata } from "next";
import {
  LegalStubShell,
  PrivacyStubBody,
} from "@/components/LegalStub";
import { BRAND, PUBLIC_SITE_ORIGIN } from "@/lib/campaign";

export const metadata: Metadata = {
  title: { absolute: `Privacy | ${BRAND.name}` },
  alternates: { canonical: `${PUBLIC_SITE_ORIGIN}/privacy` },
};

/** Short real privacy policy. No auction process notes. */
export default function PrivacyPage() {
  return (
    <LegalStubShell title="Privacy" testId="privacy-page">
      <PrivacyStubBody />
    </LegalStubShell>
  );
}
