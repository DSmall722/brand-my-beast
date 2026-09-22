import { ImmortalEtchLockup } from "@/components/ImmortalEtchLockup";
import { PUBLIC_COPY } from "@/lib/public-copy";

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
      <div className="etch-unlock" data-testid="etch-unlock">
        {PUBLIC_COPY.etch.unlockLines.map((line) => (
          <p key={line} className="section-lead">
            <ImmortalEtchLockup text={line} />
          </p>
        ))}
      </div>
      <p className="etch-requirements" data-testid="etch-requirements">
        {PUBLIC_COPY.etch.requirements}
      </p>
      <div className="etch-samples" data-testid="etch-sample-slots">
        {PUBLIC_COPY.etch.sampleSlots.map((slot) => (
          <div
            key={slot.id}
            className="etch-sample-frame"
            data-testid={`etch-sample-${slot.id}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local etch samples in /public */}
            <img
              src={slot.src}
              alt={slot.label}
              width={slot.width}
              height={slot.height}
              decoding="async"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
