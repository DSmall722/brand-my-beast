import {
  LANDMARK_PROOF_LOG_FACTS,
  LANDMARK_PROOF_LOG_LEAD,
} from "@/lib/landmark-proof-log";

export function LandmarkProofLogCard() {
  return (
    <div className="landmark-proof-log" data-testid="landmark-proof-log">
      <p className="auth-hint" data-testid="landmark-proof-log-lead">
        {LANDMARK_PROOF_LOG_LEAD}
      </p>
      <ul
        className="landmark-proof-log-list"
        data-testid="landmark-proof-log-list"
      >
        {LANDMARK_PROOF_LOG_FACTS.map((fact) => (
          <li key={fact.id} data-testid={`landmark-proof-log-${fact.id}`}>
            {fact.text}
          </li>
        ))}
      </ul>
      <p className="empty-state" data-testid="landmark-proof-log-empty">
        No landmark proofs yet. Rows start after the truck exists.
      </p>
    </div>
  );
}
