import * as React from 'react';
import { EmailTemplate, EmailButton, EmailInfoBox } from './base';

interface SubscriptionExpiringEmailProps {
  memberName: string;
  organizationName: string;
  planName: string;
  expirationDate: string;
  daysRemaining: number;
  renewUrl: string;
}

export function SubscriptionExpiringEmail({
  memberName,
  organizationName,
  planName,
  expirationDate,
  daysRemaining,
  renewUrl,
}: SubscriptionExpiringEmailProps) {
  const urgencyText = daysRemaining <= 3
    ? 'expire tres bientot'
    : daysRemaining <= 7
    ? 'expire dans quelques jours'
    : 'arrive bientot a echeance';

  return (
    <EmailTemplate
      previewText={`Votre abonnement ${planName} ${urgencyText}`}
      organizationName={organizationName}
    >
      <h1>Votre abonnement arrive a echeance</h1>
      <p>
        Bonjour {memberName},
      </p>
      <p>
        Nous vous informons que votre abonnement <strong>{planName}</strong> {urgencyText}.
      </p>
      <EmailInfoBox>
        <p style={{ margin: '4px 0' }}>
          <strong>Details de votre abonnement</strong>
        </p>
        <p style={{ margin: '4px 0', color: '#4a4a4a' }}>
          Formule : <strong>{planName}</strong>
        </p>
        <p style={{ margin: '4px 0', color: '#4a4a4a' }}>
          Date d&apos;expiration : <strong>{expirationDate}</strong>
        </p>
        <p style={{ margin: '4px 0', color: daysRemaining <= 3 ? '#dc2626' : '#4a4a4a' }}>
          Jours restants : <strong>{daysRemaining} jour{daysRemaining > 1 ? 's' : ''}</strong>
        </p>
      </EmailInfoBox>
      <p>
        Pour continuer a beneficier de l&apos;acces aux cours et a toutes les fonctionnalites,
        pensez a renouveler votre abonnement.
      </p>
      <div style={{ textAlign: 'center' }}>
        <EmailButton href={renewUrl}>Renouveler mon abonnement</EmailButton>
      </div>
      <p className="text-muted" style={{ fontSize: '14px', color: '#6b6b6b' }}>
        Des questions ? Contactez notre equipe qui se fera un plaisir de vous aider.
      </p>
    </EmailTemplate>
  );
}
