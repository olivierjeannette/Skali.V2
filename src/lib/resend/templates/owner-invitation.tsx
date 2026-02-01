import * as React from 'react';
import { EmailTemplate, EmailButton, EmailInfoBox } from './base';

interface OwnerInvitationEmailProps {
  organizationName: string;
  inviterName: string;
  inviterEmail: string;
  acceptUrl: string;
  expiresAt: string;
  planName?: string;
  trialDays?: number;
}

export function OwnerInvitationEmail({
  organizationName,
  inviterName,
  inviterEmail,
  acceptUrl,
  expiresAt,
  planName,
  trialDays = 14,
}: OwnerInvitationEmailProps) {
  const formattedExpiry = new Date(expiresAt).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <EmailTemplate
      previewText={`Invitation a gerer ${organizationName} sur Skali Prog`}
      organizationName="Skali Prog"
    >
      <h1>Vous etes invite a gerer {organizationName}</h1>

      <p>
        <strong>{inviterName}</strong> ({inviterEmail}) vous invite a devenir
        proprietaire de <strong>{organizationName}</strong> sur Skali Prog,
        la plateforme de gestion pour salles de sport et boxes CrossFit.
      </p>

      <EmailInfoBox>
        <p style={{ margin: '4px 0', fontWeight: 600 }}>Votre espace inclut :</p>
        <p style={{ margin: '4px 0', color: '#4a4a4a' }}>
          - Gestion complete de vos membres
        </p>
        <p style={{ margin: '4px 0', color: '#4a4a4a' }}>
          - Planning et reservations de cours
        </p>
        <p style={{ margin: '4px 0', color: '#4a4a4a' }}>
          - Builder de WODs avec exercices
        </p>
        <p style={{ margin: '4px 0', color: '#4a4a4a' }}>
          - Affichage TV pour votre salle
        </p>
        <p style={{ margin: '4px 0', color: '#4a4a4a' }}>
          - Paiements en ligne via Stripe
        </p>
        <p style={{ margin: '4px 0', color: '#4a4a4a' }}>
          - Application mobile pour vos membres
        </p>
      </EmailInfoBox>

      {planName && (
        <p>
          Votre compte sera configure avec le plan <strong>{planName}</strong>
          {trialDays > 0 && (
            <span>
              {' '}avec une periode d&apos;essai gratuite de{' '}
              <strong>{trialDays} jours</strong>.
            </span>
          )}
        </p>
      )}

      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <EmailButton href={acceptUrl}>Accepter l&apos;invitation</EmailButton>
      </div>

      <p style={{ fontSize: '14px', color: '#6b6b6b' }}>
        En cliquant sur le bouton ci-dessus, vous serez invite a creer
        votre compte et configurer votre salle. Le processus prend environ
        5 minutes.
      </p>

      <div
        style={{
          backgroundColor: '#fef3c7',
          borderRadius: '8px',
          padding: '16px',
          margin: '24px 0',
          borderLeft: '4px solid #f59e0b',
        }}
      >
        <p style={{ margin: 0, fontSize: '14px', color: '#92400e' }}>
          <strong>Important :</strong> Cette invitation expire le{' '}
          <strong>{formattedExpiry}</strong>. Passee cette date, vous devrez
          demander une nouvelle invitation.
        </p>
      </div>

      <p
        className="text-muted"
        style={{ fontSize: '14px', color: '#6b6b6b', marginTop: '24px' }}
      >
        Si vous n&apos;avez pas demande cette invitation, vous pouvez ignorer
        cet email. Aucune action ne sera prise sans votre consentement.
      </p>
    </EmailTemplate>
  );
}

// Email pour rappel d'invitation (si pas acceptee apres quelques jours)
interface OwnerInvitationReminderEmailProps {
  organizationName: string;
  acceptUrl: string;
  expiresAt: string;
  daysRemaining: number;
}

export function OwnerInvitationReminderEmail({
  organizationName,
  acceptUrl,
  expiresAt,
  daysRemaining,
}: OwnerInvitationReminderEmailProps) {
  const formattedExpiry = new Date(expiresAt).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <EmailTemplate
      previewText={`Rappel: Votre invitation pour ${organizationName} expire bientot`}
      organizationName="Skali Prog"
    >
      <h1>Votre invitation expire bientot</h1>

      <p>
        Vous avez ete invite a gerer <strong>{organizationName}</strong> sur
        Skali Prog. Cette invitation expire dans{' '}
        <strong>{daysRemaining} jour{daysRemaining > 1 ? 's' : ''}</strong>.
      </p>

      <p>
        Ne manquez pas cette opportunite de digitaliser la gestion de votre
        salle avec notre plateforme complete.
      </p>

      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <EmailButton href={acceptUrl}>Accepter maintenant</EmailButton>
      </div>

      <p style={{ fontSize: '14px', color: '#6b6b6b' }}>
        Date d&apos;expiration : {formattedExpiry}
      </p>
    </EmailTemplate>
  );
}

// Email de confirmation apres acceptation
interface OwnerWelcomeEmailProps {
  ownerName: string;
  organizationName: string;
  dashboardUrl: string;
  setupGuideUrl?: string;
}

export function OwnerWelcomeEmail({
  ownerName,
  organizationName,
  dashboardUrl,
  setupGuideUrl,
}: OwnerWelcomeEmailProps) {
  return (
    <EmailTemplate
      previewText={`Bienvenue sur Skali Prog - ${organizationName} est pret!`}
      organizationName="Skali Prog"
    >
      <h1>Bienvenue {ownerName} !</h1>

      <p>
        Felicitations ! Votre compte a ete cree avec succes et{' '}
        <strong>{organizationName}</strong> est maintenant actif sur
        Skali Prog.
      </p>

      <EmailInfoBox>
        <p style={{ margin: '4px 0', fontWeight: 600 }}>
          Prochaines etapes recommandees :
        </p>
        <p style={{ margin: '8px 0 4px', color: '#4a4a4a' }}>
          1. Configurez vos informations de salle
        </p>
        <p style={{ margin: '4px 0', color: '#4a4a4a' }}>
          2. Importez ou ajoutez vos membres
        </p>
        <p style={{ margin: '4px 0', color: '#4a4a4a' }}>
          3. Creez vos plans d&apos;abonnement
        </p>
        <p style={{ margin: '4px 0', color: '#4a4a4a' }}>
          4. Configurez votre planning de cours
        </p>
        <p style={{ margin: '4px 0', color: '#4a4a4a' }}>
          5. Connectez Stripe pour les paiements
        </p>
      </EmailInfoBox>

      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <EmailButton href={dashboardUrl}>Acceder au tableau de bord</EmailButton>
      </div>

      {setupGuideUrl && (
        <p style={{ textAlign: 'center', fontSize: '14px' }}>
          <a href={setupGuideUrl} style={{ color: '#0a0a0a' }}>
            Consulter le guide de demarrage
          </a>
        </p>
      )}

      <p
        className="text-muted"
        style={{ fontSize: '14px', color: '#6b6b6b', marginTop: '24px' }}
      >
        Besoin d&apos;aide ? Notre equipe support est disponible pour vous
        accompagner dans la mise en place de votre salle.
      </p>
    </EmailTemplate>
  );
}
