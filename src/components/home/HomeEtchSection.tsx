import { PUBLIC_COPY } from "@/lib/public-copy";

/** Slice 7.1 — extracted from `src/app/page.tsx`. Copy unchanged. */
export function HomeEtchSection() {
  return (
        <section
          className="shell section"
          id="etch"
          aria-labelledby="etch-title"
          data-testid="etch-section"
        >
          <h2 id="etch-title">{PUBLIC_COPY.etch.heading}</h2>
          <p className="section-lead">{PUBLIC_COPY.etch.body}</p>
          <p className="section-lead">{PUBLIC_COPY.etch.whyBuyout}</p>
          <p className="section-lead">{PUBLIC_COPY.etch.cost}</p>
          <p className="section-lead">{PUBLIC_COPY.etch.art}</p>
        </section>
  );
}
