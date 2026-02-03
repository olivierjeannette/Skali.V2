import { AnimatedSection } from '@/components/landing';

export const metadata = {
  title: 'Politique de confidentialite - Skali Prog',
  description: 'Politique de confidentialite et protection des donnees personnelles de Skali Prog.',
};

export default function PrivacyPage() {
  return (
    <div className="py-24">
      <div className="container mx-auto px-4">
        <AnimatedSection className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Politique de confidentialite</h1>
          <p className="text-muted-foreground mb-8">Derniere mise a jour : Fevrier 2026</p>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
              <p className="text-muted-foreground">
                Skali Prog s&apos;engage a proteger la vie privee de ses utilisateurs. Cette
                politique de confidentialite explique comment nous collectons, utilisons et
                protegeons vos donnees personnelles conformement au Reglement General sur la
                Protection des Donnees (RGPD).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Responsable du traitement</h2>
              <p className="text-muted-foreground">
                Le responsable du traitement des donnees est Skali Prog, joignable a l&apos;adresse :{' '}
                <a href="mailto:privacy@skaliprog.com" className="text-primary hover:underline">
                  privacy@skaliprog.com
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Donnees collectees</h2>
              <p className="text-muted-foreground mb-4">Nous collectons les donnees suivantes :</p>

              <h3 className="text-lg font-medium mb-2">Donnees d&apos;identification</h3>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
                <li>Nom et prenom</li>
                <li>Adresse email</li>
                <li>Numero de telephone</li>
                <li>Adresse postale (pour les organisations)</li>
              </ul>

              <h3 className="text-lg font-medium mb-2">Donnees de connexion</h3>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
                <li>Adresse IP</li>
                <li>Logs de connexion</li>
                <li>Donnees de navigation</li>
              </ul>

              <h3 className="text-lg font-medium mb-2">Donnees metier</h3>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Informations sur les membres (pour les gestionnaires de salles)</li>
                <li>Historique des reservations et presences</li>
                <li>Performances sportives</li>
                <li>Informations d&apos;abonnement et de facturation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Finalites du traitement</h2>
              <p className="text-muted-foreground mb-4">Vos donnees sont utilisees pour :</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Fournir et ameliorer nos services</li>
                <li>Gerer votre compte et vos abonnements</li>
                <li>Vous envoyer des communications relatives a nos services</li>
                <li>Assurer la securite de la plateforme</li>
                <li>Respecter nos obligations legales</li>
                <li>Analyser l&apos;utilisation de nos services (statistiques anonymisees)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Base legale du traitement</h2>
              <p className="text-muted-foreground mb-4">Le traitement de vos donnees repose sur :</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>L&apos;execution du contrat</strong> : pour fournir nos services</li>
                <li><strong>Le consentement</strong> : pour les communications marketing</li>
                <li><strong>L&apos;interet legitime</strong> : pour ameliorer nos services</li>
                <li><strong>L&apos;obligation legale</strong> : pour respecter la reglementation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Destinataires des donnees</h2>
              <p className="text-muted-foreground mb-4">
                Vos donnees peuvent etre partagees avec :
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Nos sous-traitants techniques (hebergement, paiement)</li>
                <li>Les autorites competentes en cas d&apos;obligation legale</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Nous ne vendons jamais vos donnees a des tiers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Transferts hors UE</h2>
              <p className="text-muted-foreground">
                Certains de nos sous-traitants sont situes hors de l&apos;Union Europeenne.
                Dans ce cas, nous nous assurons que des garanties appropriees sont mises en
                place (clauses contractuelles types, adequation).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Duree de conservation</h2>
              <p className="text-muted-foreground mb-4">Vos donnees sont conservees :</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Donnees de compte : pendant la duree de votre abonnement + 3 ans</li>
                <li>Donnees de facturation : 10 ans (obligation legale)</li>
                <li>Logs de connexion : 1 an</li>
                <li>Donnees de navigation : 13 mois</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Vos droits</h2>
              <p className="text-muted-foreground mb-4">
                Conformement au RGPD, vous disposez des droits suivants :
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Droit d&apos;acces</strong> : obtenir une copie de vos donnees</li>
                <li><strong>Droit de rectification</strong> : corriger vos donnees</li>
                <li><strong>Droit a l&apos;effacement</strong> : supprimer vos donnees</li>
                <li><strong>Droit a la portabilite</strong> : recevoir vos donnees dans un format structure</li>
                <li><strong>Droit d&apos;opposition</strong> : vous opposer a certains traitements</li>
                <li><strong>Droit a la limitation</strong> : limiter le traitement de vos donnees</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Pour exercer ces droits, contactez-nous a :{' '}
                <a href="mailto:privacy@skaliprog.com" className="text-primary hover:underline">
                  privacy@skaliprog.com
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Securite</h2>
              <p className="text-muted-foreground">
                Nous mettons en oeuvre des mesures techniques et organisationnelles appropriees
                pour proteger vos donnees : chiffrement SSL/TLS, acces restreint, sauvegardes
                regulieres, audits de securite.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Reclamation</h2>
              <p className="text-muted-foreground">
                Si vous estimez que vos droits ne sont pas respectes, vous pouvez introduire
                une reclamation aupres de la CNIL (Commission Nationale de l&apos;Informatique
                et des Libertes) : www.cnil.fr
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Contact</h2>
              <p className="text-muted-foreground">
                Pour toute question relative a cette politique, contactez notre DPO a :{' '}
                <a href="mailto:privacy@skaliprog.com" className="text-primary hover:underline">
                  privacy@skaliprog.com
                </a>
              </p>
            </section>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
