import { WaitlistForm } from "@/components/WaitlistForm";
import { PUBLIC_COPY } from "@/lib/public-copy";

/** Slice 7.1 — extracted from `src/app/page.tsx`. Copy unchanged. */
export function HomeWaitlistSection() {
  return (
        <section
          className="shell section"
          id="waitlist"
          aria-labelledby="waitlist-title"
        >
          <h2 id="waitlist-title">{PUBLIC_COPY.waitlist.heading}</h2>
          <WaitlistForm />
        </section>
  );
}
