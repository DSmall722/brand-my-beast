import { ImmortalEtchLockup } from "@/components/ImmortalEtchLockup";
import { PUBLIC_COPY } from "@/lib/public-copy";

/** One guest step: pick a panel and bid. Floor and etch live in other sections. */
export function HomeStorySection() {
  const step = PUBLIC_COPY.howItWorks.steps[0];
  return (
    <section
      className="shell section"
      id="story"
      aria-labelledby="story-title"
    >
      <h2 id="story-title">{PUBLIC_COPY.howItWorks.heading}</h2>
      <div className="story-block" data-testid="how-it-works">
        <strong className="story-step-title">{step.title}</strong>
        <p className="story-step-copy">
          <ImmortalEtchLockup text={step.body} />
        </p>
      </div>
    </section>
  );
}
