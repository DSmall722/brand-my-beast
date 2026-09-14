import {
  QR_NFC_SCAN_COUNTER_FACTS,
  QR_NFC_SCAN_COUNTER_LEAD,
} from "@/lib/qr-nfc-scan-counter";

export function QrNfcScanCounterCard() {
  return (
    <div className="qr-nfc-scan-counter" data-testid="qr-nfc-scan-counter">
      <p className="auth-hint" data-testid="qr-nfc-scan-counter-lead">
        {QR_NFC_SCAN_COUNTER_LEAD}
      </p>
      <ul
        className="qr-nfc-scan-counter-list"
        data-testid="qr-nfc-scan-counter-list"
      >
        {QR_NFC_SCAN_COUNTER_FACTS.map((fact) => (
          <li key={fact.id} data-testid={`qr-nfc-scan-counter-${fact.id}`}>
            {fact.text}
          </li>
        ))}
      </ul>
      <p className="empty-state" data-testid="qr-nfc-scan-counter-empty">
        No scans yet. Raw count starts after the truck exists.
      </p>
    </div>
  );
}
