import { AuthNav } from "@/components/AuthNav";
import { PUBLIC_COPY } from "@/lib/public-copy";

export async function HomeHeader() {
  return (
      <header
        className="shell site-header"
        data-header-row="single"
        data-signin-closed="true"
      >
        <div className="wordmark" data-testid="brand-wordmark">
          {PUBLIC_COPY.header.wordmark}
        </div>
        <nav className="header-nav" aria-label="Primary">
          <a className="nav-link" href="#contactus">
            {PUBLIC_COPY.header.nav}
          </a>
          <AuthNav />
        </nav>
      </header>
  );
}
