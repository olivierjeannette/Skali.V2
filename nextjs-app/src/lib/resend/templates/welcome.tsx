import * as React from 'react';
import { EmailTemplate, EmailButton, EmailInfoBox } from './base';

interface WelcomeEmailProps {
  memberName: string;
  organizationName: string;
  loginUrl: string;
}

export function WelcomeEmail({
  memberName,
  organizationName,
  loginUrl,
}: WelcomeEmailProps) {
  return (
    <EmailTemplate
      previewText={`Bienvenue chez ${organizationName}`}
      organizationName={organizationName}
    >
      <h1>Bienvenue {memberName} !</h1>
      <p>
        Nous sommes ravis de vous accueillir chez <strong>{organizationName}</strong>.
        Votre compte a ete cree avec succes.
      </p>
      <p>
        Vous pouvez maintenant vous connecter pour acceder a votre espace personnel,
        consulter le planning et vous inscrire aux cours.
      </p>
      <div style={{ textAlign: 'center' }}>
        <EmailButton href={loginUrl}>Acceder a mon espace</EmailButton>
      </div>
      <EmailInfoBox>
        <p style={{ margin: '4px 0' }}>
          <strong>Que pouvez-vous faire ?</strong>
        </p>
        <p style={{ margin: '4px 0', color: '#4a4a4a' }}>- Consulter le planning des cours</p>
        <p style={{ margin: '4px 0', color: '#4a4a4a' }}>- Vous inscrire aux seances</p>
        <p style={{ margin: '4px 0', color: '#4a4a4a' }}>- Voir le WOD du jour</p>
        <p style={{ margin: '4px 0', color: '#4a4a4a' }}>- Suivre vos performances</p>
      </EmailInfoBox>
      <p className="text-muted" style={{ fontSize: '14px', color: '#6b6b6b' }}>
        Si vous avez des questions, n&apos;hesitez pas a contacter l&apos;equipe.
      </p>
    </EmailTemplate>
  );
}
