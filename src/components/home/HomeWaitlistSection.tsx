import { WaitlistForm } from "@/components/WaitlistForm";
import { PUBLIC_COPY } from "@/lib/public-copy";

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
