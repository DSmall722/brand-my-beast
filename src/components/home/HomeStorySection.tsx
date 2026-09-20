import { PUBLIC_COPY } from "@/lib/public-copy";

/** Slice 7.1 — extracted from `src/app/page.tsx`. Copy unchanged. */
export function HomeStorySection() {
  return (
        <section
          className="shell section"
          id="story"
          aria-labelledby="story-title"
        >
          <h2 id="story-title">{PUBLIC_COPY.howItWorks.heading}</h2>
          <ol className="story-list">
            {PUBLIC_COPY.howItWorks.steps.map((step, index) => (
              <li key={step.title}>
                <span className="story-num">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="story-body">
                  <strong className="story-step-title">{step.title}</strong>
                  <span className="story-step-copy">
                    {step.body.endsWith(PUBLIC_COPY.etch.forever) ? (
                      <>
                        {step.body
                          .slice(0, -PUBLIC_COPY.etch.forever.length)
                          .trimEnd()}{" "}
                        <span className="immortal-etch">
                          {PUBLIC_COPY.etch.forever}
                        </span>
                      </>
                    ) : (
                      step.body
                    )}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>
  );
}
