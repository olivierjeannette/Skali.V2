import * as React from 'react';
import { EmailTemplate, EmailButton, EmailInfoBox } from './base';

interface ClassReminderEmailProps {
  memberName: string;
  organizationName: string;
  className: string;
  classDate: string;
  classTime: string;
  coachName?: string;
  cancelUrl: string;
}

export function ClassReminderEmail({
  memberName,
  organizationName,
  className,
  classDate,
  classTime,
  coachName,
  cancelUrl,
}: ClassReminderEmailProps) {
  return (
    <EmailTemplate
      previewText={`Rappel: ${className} demain a ${classTime}`}
      organizationName={organizationName}
    >
      <h1>Rappel de cours</h1>
      <p>
        Bonjour {memberName},
      </p>
      <p>
        Nous vous rappelons que vous etes inscrit(e) au cours suivant :
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
      </EmailInfoBox>
      <p>
        Nous vous attendons avec impatience !
      </p>
      <p className="text-muted" style={{ fontSize: '14px', color: '#6b6b6b' }}>
        Vous ne pouvez pas venir ? Pensez a annuler votre reservation pour liberer votre place.
      </p>
      <div style={{ textAlign: 'center' }}>
        <EmailButton href={cancelUrl}>Gerer ma reservation</EmailButton>
      </div>
    </EmailTemplate>
  );
}
