import { Fragment } from "react";

const TOKEN = "Immortal Etch";

/** Syne lockup on the product name only. Body copy stays IBM Plex. */
export function ImmortalEtchLockup({ text }: { readonly text: string }) {
  const parts = text.split(TOKEN);
  if (parts.length === 1) {
    return text;
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
