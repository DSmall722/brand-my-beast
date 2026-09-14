import { artworkIsUpload } from "@/lib/intent-artwork";

/** Compact preview of intent artwork for seat + operator queues. */
export function IntentArtworkPreview({
  artworkUrl,
  bidId,
}: {
  artworkUrl: string | null | undefined;
  bidId: string;
}) {
  if (!artworkUrl) return null;

  const uploaded = artworkIsUpload(artworkUrl);

  return (
    <div
      className="intent-artwork-preview"
      data-testid={`intent-artwork-${bidId}`}
      data-artwork-kind={uploaded ? "upload" : "url"}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={artworkUrl}
        alt=""
        className="intent-artwork-thumb"
        data-testid={`intent-artwork-thumb-${bidId}`}
      />
      {uploaded ? (
        <span className="auth-hint" data-testid={`intent-artwork-label-${bidId}`}>
          Uploaded artwork
        </span>
      ) : (
        <a
          href={artworkUrl}
          target="_blank"
          rel="noreferrer"
          className="intent-artwork-link"
          data-testid={`intent-artwork-link-${bidId}`}
        >
          Artwork URL
        </a>
      )}
    </div>
  );
}
