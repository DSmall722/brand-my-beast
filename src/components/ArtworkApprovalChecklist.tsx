import {
  artworkChecklistForPanel,
  type ArtworkChecklistItem,
} from "@/lib/artwork-approval";

export function ArtworkApprovalChecklist({
  etchable,
}: {
  etchable: boolean;
}) {
  const items: ArtworkChecklistItem[] = artworkChecklistForPanel(etchable);

  return (
    <div
      className="artwork-approval-checklist"
      data-testid="artwork-approval-checklist"
    >
      <p className="artwork-approval-title">Artwork checklist</p>
      <ul className="artwork-approval-list" data-testid="artwork-checklist-list">
        {items.map((item) => (
          <li
            key={item.id}
            data-testid={`artwork-check-${item.id}`}
            data-etch-only={item.etchOnly ? "true" : "false"}
          >
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
