import { ImmortalEtchLockup } from "@/components/ImmortalEtchLockup";
import { PUBLIC_COPY } from "@/lib/public-copy";

/** Three guest steps. Floor and etch stay in Track the Auction, Immortal Etch, and the FAQ. */
export function HomeStorySection() {
  return (
    <section
      className="shell section"
      id="story"
      aria-labelledby="how-it-works"
    >
      <h2 id="how-it-works">{PUBLIC_COPY.howItWorks.heading}</h2>
      <ol className="story-list" data-testid="how-it-works">
        {PUBLIC_COPY.howItWorks.steps.map((step, index) => (
          <li key={step.title}>
            <span className="story-num">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="story-body">
              <strong className="story-step-title">{step.title}</strong>
              <span className="story-step-copy">
                <ImmortalEtchLockup text={step.body} />
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
