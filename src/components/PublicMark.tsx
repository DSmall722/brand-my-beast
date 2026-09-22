export function PublicMark({
  brandLabel,
  logoUrl,
}: {
  brandLabel: string;
  logoUrl: string | null;
}) {
  return (
    <span
      className="public-mark"
      data-artwork={logoUrl ? "approved" : "name"}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- bidder logo URL or stored upload path
        <img src={logoUrl} alt="" className="public-mark-logo" />
      ) : null}
      <span className="public-mark-name">{brandLabel}</span>
    </span>
  );
}
