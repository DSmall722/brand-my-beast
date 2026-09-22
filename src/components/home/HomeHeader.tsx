import { AuthNav } from "@/components/AuthNav";
import { PUBLIC_COPY } from "@/lib/public-copy";

/** Slice 7.1 — extracted from `src/app/page.tsx`. Copy unchanged. */
export async function HomeHeader() {
  return (
      <header
        className="shell site-header"
        data-header-row="single"
        data-signin-closed="false"
      >
        <div className="wordmark" data-testid="brand-wordmark">
          {PUBLIC_COPY.header.wordmark}
        </div>
        <nav className="header-nav" aria-label="Primary">
          <a className="nav-link" href="#waitlist">
            {PUBLIC_COPY.header.nav}
          </a>
          <AuthNav />
        </nav>
      </header>
  );
}
