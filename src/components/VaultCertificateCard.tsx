import {
  VAULT_CERTIFICATE_FACTS,
  VAULT_CERTIFICATE_LEAD,
} from "@/lib/vault-certificate";

export function VaultCertificateCard() {
  return (
    <div className="vault-certificate" data-testid="vault-certificate">
      <p className="auth-hint" data-testid="vault-certificate-lead">
        {VAULT_CERTIFICATE_LEAD}
      </p>
      <ul className="vault-certificate-list" data-testid="vault-certificate-list">
        {VAULT_CERTIFICATE_FACTS.map((fact) => (
          <li key={fact.id} data-testid={`vault-cert-${fact.id}`}>
            {fact.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
