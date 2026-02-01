import * as React from 'react';
import { EmailTemplate, EmailButton, EmailInfoBox } from './base';

interface BookingConfirmationEmailProps {
  memberName: string;
  organizationName: string;
  className: string;
  classDate: string;
  classTime: string;
  coachName?: string;
  spotsRemaining?: number;
  cancelUrl: string;
}

export function BookingConfirmationEmail({
  memberName,
  organizationName,
  className,
  classDate,
  classTime,
  coachName,
  spotsRemaining,
  cancelUrl,
}: BookingConfirmationEmailProps) {
  return (
    <EmailTemplate
      previewText={`Reservation confirmee : ${className}`}
      organizationName={organizationName}
    >
      <h1>Reservation confirmee</h1>
      <p>
        Bonjour {memberName},
      </p>
      <p>
        Votre inscription au cours a bien ete enregistree. A bientot !
      </p>
      <EmailInfoBox>
        <p style={{ margin: '4px 0' }}>
          <strong>{className}</strong>
        </p>
        <p style={{ margin: '4px 0', color: '#4a4a4a' }}>
          Date : <strong>{classDate}</strong>
        </p>
        <p style={{ margin: '4px 0', color: '#4a4a4a' }}>
          Heure : <strong>{classTime}</strong>
        </p>
        {coachName && (
          <p style={{ margin: '4px 0', color: '#4a4a4a' }}>
            Coach : <strong>{coachName}</strong>
          </p>
        )}
        {spotsRemaining !== undefined && (
          <p style={{ margin: '8px 0 4px 0', color: '#6b6b6b', fontSize: '14px' }}>
            Places restantes : {spotsRemaining}
          </p>
        )}
      </EmailInfoBox>
      <p className="text-muted" style={{ fontSize: '14px', color: '#6b6b6b' }}>
        Vous ne pouvez finalement pas venir ? Pensez a annuler votre reservation
        pour liberer votre place a un autre membre.
      </p>
      <div style={{ textAlign: 'center' }}>
        <EmailButton href={cancelUrl}>Gerer ma reservation</EmailButton>
      </div>
    </EmailTemplate>
  );
}
