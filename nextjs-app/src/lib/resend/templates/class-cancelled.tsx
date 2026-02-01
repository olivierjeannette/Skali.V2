import * as React from 'react';
import { EmailTemplate, EmailButton, EmailInfoBox } from './base';

interface ClassCancelledEmailProps {
  memberName: string;
  organizationName: string;
  className: string;
  classDate: string;
  classTime: string;
  reason?: string;
  planningUrl: string;
}

export function ClassCancelledEmail({
  memberName,
  organizationName,
  className,
  classDate,
  classTime,
  reason,
  planningUrl,
}: ClassCancelledEmailProps) {
  return (
    <EmailTemplate
      previewText={`Cours annule : ${className} du ${classDate}`}
      organizationName={organizationName}
    >
      <h1>Cours annule</h1>
      <p>
        Bonjour {memberName},
      </p>
      <p>
        Nous vous informons que le cours auquel vous etiez inscrit(e) a ete annule.
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
        {reason && (
          <p style={{ margin: '8px 0 4px 0', color: '#6b6b6b', fontStyle: 'italic' }}>
            Raison : {reason}
          </p>
        )}
      </EmailInfoBox>
      <p>
        Nous nous excusons pour ce desagrement. N&apos;hesitez pas a vous inscrire a un autre cours.
      </p>
      <div style={{ textAlign: 'center' }}>
        <EmailButton href={planningUrl}>Voir le planning</EmailButton>
      </div>
    </EmailTemplate>
  );
}
