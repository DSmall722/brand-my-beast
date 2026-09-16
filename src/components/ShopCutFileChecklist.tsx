"use client";

import { useState, type FormEvent } from "react";
import { CLOSE_AT } from "@/lib/campaign";
import {
  SHOP_CUT_FILE_CHECKLIST,
  assertShopCutFileChecklistDoesNotSetCloseAt,
  shopCutFileChecklistFenceCopy,
} from "@/lib/shop-cut-file-checklist";

/**
 * Slice 12.23 — shop cut-file checklist as a <form> on /partner/shop.
 * Not a card. Not on `/`. Checkboxes are local prep only.
 */
export function ShopCutFileChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  function toggle(id: string) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (!assertShopCutFileChecklistDoesNotSetCloseAt(Object.keys(next))) {
        return prev;
      }
      return next;
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <form
      className="shop-cut-file-checklist"
      data-testid="shop-cut-file-checklist"
      data-auction-clock={CLOSE_AT === null ? "unset" : "set"}
      aria-label="Shop cut-file checklist"
      onSubmit={onSubmit}
    >
      <p className="shop-cut-file-checklist-lead" id="shop-cut-file-lead">
        Cut-file checklist — vinyl cutter prep. Form only. Not a homepage card.
      </p>
      <ul
        className="shop-cut-file-checklist-list"
        data-testid="shop-cut-file-checklist-list"
        aria-labelledby="shop-cut-file-lead"
      >
        {SHOP_CUT_FILE_CHECKLIST.map((item) => {
          const inputId = `shop-cut-${item.id}`;
          const isOn = Boolean(checked[item.id]);
          return (
            <li key={item.id} data-testid={`shop-cut-item-${item.id}`}>
              <label htmlFor={inputId} className="shop-cut-file-checklist-label">
                <input
                  id={inputId}
                  type="checkbox"
                  name={item.id}
                  checked={isOn}
                  onChange={() => toggle(item.id)}
                  data-testid={`shop-cut-check-${item.id}`}
                />
                <span>{item.label}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="auth-hint" data-testid="shop-cut-file-fence">
        {shopCutFileChecklistFenceCopy()}
      </p>
    </form>
  );
}
