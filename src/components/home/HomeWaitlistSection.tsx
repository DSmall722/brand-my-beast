import { WaitlistForm } from "@/components/WaitlistForm";
import { PUBLIC_COPY } from "@/lib/public-copy";

/** Slice 7.1 — extracted from `src/app/page.tsx`. Copy unchanged. */
export function HomeWaitlistSection() {
  return (
        <section
          className="shell section"
          id="contactus"
          aria-labelledby="waitlist-title"
        >
          <div id="waitlist" aria-hidden="true" />
          <h2 id="waitlist-title">{PUBLIC_COPY.waitlist.heading}</h2>
          <WaitlistForm />
        </section>
  );
}
