import { PUBLIC_COPY } from "@/lib/public-copy";

/** Immortal Etch stays on the homepage. Sample frames wait on real etch photos. */
export function HomeEtchSection() {
  return (
    <section
      className="shell section"
      id="etch"
      aria-labelledby="etch-title"
      data-testid="etch-section"
    >
      <h2 id="etch-title">
        {PUBLIC_COPY.etch.heading}
      </h2>
      <p className="etch-requirements" data-testid="etch-requirements">
        {PUBLIC_COPY.etch.requirements}
      </p>
      <div className="etch-samples" data-testid="etch-sample-slots">
        {PUBLIC_COPY.etch.sampleSlots.map((slot) => (
          <div
            key={slot.id}
            className="etch-sample-frame"
            role="img"
            aria-label={slot.label}
            data-testid={`etch-sample-${slot.id}`}
          />
        ))}
      </div>
    </section>
  );
}
