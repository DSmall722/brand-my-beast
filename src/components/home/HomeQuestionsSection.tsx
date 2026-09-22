import { PUBLIC_COPY } from "@/lib/public-copy";

/** Slice 7.1 — extracted from `src/app/page.tsx`. Copy unchanged. */
export function HomeQuestionsSection() {
  return (
        <section
          className="shell section"
          id="questions"
          aria-labelledby="questions-title"
          data-testid="questions-section"
        >
          <h2 id="questions-title">{PUBLIC_COPY.questions.heading}</h2>
          <dl className="questions-list">
            {PUBLIC_COPY.questions.items.map((item) => {
              const id = "id" in item ? item.id : undefined;
              return (
                <div
                  key={item.q}
                  className="questions-item"
                  data-testid={id ? `faq-${id}` : undefined}
                >
                  <dt>{item.q}</dt>
                  <dd>{item.a}</dd>
                </div>
              );
            })}
          </dl>
        </section>
  );
}
