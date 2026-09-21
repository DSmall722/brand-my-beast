import { Fragment } from "react";

const TOKEN = "Immortal Etch";

function renderTokens(line: string) {
  const parts = line.split(TOKEN);
  if (parts.length === 1) {
    return line;
  }
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 ? <span className="immortal-etch">{TOKEN}</span> : null}
          {part}
        </Fragment>
      ))}
    </>
  );
}

/** Syne lockup on the product name only. Body copy stays IBM Plex. A newline is its own line. */
export function ImmortalEtchLockup({ text }: { readonly text: string }) {
  const lines = text.split("\n");
  if (lines.length === 1) {
    return renderTokens(lines[0] ?? "");
  }
  return (
    <>
      {lines.map((line, lineIndex) => (
        <Fragment key={lineIndex}>
          {lineIndex > 0 ? (
            <>
              {" "}
              <br />
            </>
          ) : null}
          {renderTokens(line)}
        </Fragment>
      ))}
    </>
  );
}
