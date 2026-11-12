// Reader chart for AuctionClose. One tick is the 10-minute soft-close step.
// Close0 = 2, Soft = 1, matching the constants in AuctionClose.tla.

const CLOSE0 = 2;
const SOFT = 1;
const IDS = ["b1", "b2"];

const recorded = new Set(["unpaid", "paid", "refunded"]);

function rows(v) {
  return IDS.map((id) => ({
    id,
    status: v.status[id],
    createdAt: v.createdAt[id],
    paidAt: v.paidAt[id],
    credit: v.credits[id],
  }));
}

function present(v) {
  return rows(v).filter((b) => recorded.has(b.status));
}

function earlier(a, b) {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt;
  return a.id < b.id;
}

function effective(v) {
  const ordered = present(v).slice().sort((a, b) => (earlier(a, b) ? -1 : 1));
  let close = CLOSE0;
  for (const row of ordered) {
    const t = row.createdAt;
    if (t >= close - SOFT && t < close) close += SOFT;
  }
  return close;
}

function lateRecord(v) {
  const close = effective(v);
  return present(v).some((b) => b.createdAt >= close);
}

function lateCredit(v) {
  const close = effective(v);
  return rows(v).some((b) => b.credit && b.paidAt >= close);
}

function twice(v) {
  return v.applyCount >= 2;
}

function holding(v) {
  return Object.values(v.pc).includes("holding");
}

function armed(v) {
  return Object.values(v.status).includes("armed");
}

function credited(v) {
  return Object.values(v.credits).some(Boolean);
}

export const title = "How the board closes and settles";

export const state = (v) => {
  const bits = [];
  if (lateRecord(v)) bits.push("A bid was recorded at the close");
  if (lateCredit(v)) bits.push("A deposit paid at the close was credited");
  if (twice(v)) bits.push("Settlement ran twice");
  if (bits.length) return bits.join(". ");
  const pushed = effective(v) > CLOSE0;
  if (holding(v)) return pushed ? "Settling a pushed-back close" : "Settling";
  if (credited(v)) return pushed ? "Winner credited after a push" : "Winner credited";
  if (v.applyCount >= 1) return "Deposits refunded";
  const closed = v.now >= effective(v);
  if (closed && armed(v)) return "Closed while a bid is still being recorded";
  if (closed) return pushed ? "Bidding closed after a push" : "Bidding closed";
  if (armed(v) && pushed) return "Close pushed back, a bid is being recorded";
  if (armed(v)) return "A bid is being recorded";
  if (pushed) return "Close pushed back";
  return "Bidding open";
};

export const group = (v) => {
  const label = state(v);
  if (
    label.includes("recorded at the close") ||
    label.includes("paid at the close") ||
    label.includes("Settlement ran twice")
  ) {
    return "Broken";
  }
  if (label.startsWith("Settling")) return "Settling";
  if (label.startsWith("Winner credited") || label === "Deposits refunded") return "Settled";
  if (label.startsWith("Bidding closed") || label.startsWith("Closed")) return "Closed";
  return "Open";
};

export const colors = {
  Open: "teal",
  Closed: "orange",
  Settling: "yellow",
  Settled: "blue",
  Broken: "pink",
};

export const step = (action) => {
  if (action.startsWith("Tick")) return "the clock moves";
  if (action.startsWith("Arm")) return "you submit a bid";
  if (action.startsWith("Commit")) return "the bid is recorded";
  if (action.startsWith("Pay")) return "the deposit clears";
  if (action.startsWith("Begin")) return "a page starts settlement";
  if (action.startsWith("Apply")) return "settlement is written";
  return "the board moves";
};
