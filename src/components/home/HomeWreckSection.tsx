import { PUBLIC_COPY } from "@/lib/public-copy";

/** Slice 7.1 — extracted from `src/app/page.tsx`. Copy unchanged. */
export function HomeWreckSection() {
  return (
        <section
          className="shell section"
          id="wreck"
          aria-labelledby="wreck-title"
          data-testid="wreck-refund-faq"
        >
          <h2 id="wreck-title">{PUBLIC_COPY.wreck.heading}</h2>
          <p className="section-lead">{PUBLIC_COPY.wreck.lead}</p>
          <dl className="wreck-list" data-testid="wreck-refund-rules">
            {PUBLIC_COPY.wreck.items.map((item) => (
              <div key={item.id} data-testid={`wreck-rule-${item.id}`}>
                <dt data-testid={`wreck-title-${item.id}`}>{item.q}</dt>
                <dd data-testid={`wreck-body-${item.id}`}>{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
  );
}
