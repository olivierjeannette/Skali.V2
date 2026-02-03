import { AnimatedSection } from '@/components/landing';

export const metadata = {
  title: 'Conditions Generales d\'Utilisation - Skali Prog',
  description: 'Conditions Generales d\'Utilisation de Skali Prog.',
};

export default function CGUPage() {
  return (
    <div className="py-24">
      <div className="container mx-auto px-4">
        <AnimatedSection className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Conditions Generales d&apos;Utilisation</h1>
          <p className="text-muted-foreground mb-8">Derniere mise a jour : Fevrier 2026</p>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Objet</h2>
              <p className="text-muted-foreground">
                Les presentes Conditions Generales d&apos;Utilisation (CGU) ont pour objet de definir
                les modalites et conditions d&apos;utilisation des services proposes par Skali Prog,
                ainsi que de definir les droits et obligations des parties dans ce cadre.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Acceptation des CGU</h2>
              <p className="text-muted-foreground">
                L&apos;utilisation de la plateforme Skali Prog implique l&apos;acceptation pleine et
                entiere des presentes CGU. En vous inscrivant ou en utilisant nos services, vous
                reconnaissez avoir lu, compris et accepte les presentes conditions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Description des services</h2>
              <p className="text-muted-foreground mb-4">
                Skali Prog propose une plateforme de gestion pour les box CrossFit et salles de
                fitness, incluant notamment :
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Gestion des membres et des abonnements</li>
                <li>Planning et reservation des cours</li>
                <li>Suivi des performances et workouts</li>
                <li>Outils de communication et automatisation</li>
                <li>Tableau de bord et analytics</li>
                <li>Gestion des paiements</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Inscription et compte</h2>
              <p className="text-muted-foreground mb-4">
                Pour acceder aux services, l&apos;utilisateur doit creer un compte en fournissant
                des informations exactes et a jour. L&apos;utilisateur est responsable de la
                confidentialite de ses identifiants de connexion.
              </p>
              <p className="text-muted-foreground">
                En cas d&apos;utilisation frauduleuse de votre compte, vous devez nous en informer
                immediatement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Tarifs et paiement</h2>
              <p className="text-muted-foreground mb-4">
                Les tarifs des differents abonnements sont indiques sur notre site. Sauf mention
                contraire, les prix sont exprimes en euros et hors taxes.
              </p>
              <p className="text-muted-foreground">
                Le paiement s&apos;effectue par prelevement automatique mensuel ou annuel selon
                la formule choisie. L&apos;utilisateur peut modifier ou annuler son abonnement
                a tout moment depuis son espace client.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Obligations de l&apos;utilisateur</h2>
              <p className="text-muted-foreground mb-4">L&apos;utilisateur s&apos;engage a :</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Utiliser la plateforme conformement a sa destination</li>
                <li>Ne pas porter atteinte aux droits de tiers</li>
                <li>Ne pas tenter de contourner les mesures de securite</li>
                <li>Respecter la legislation en vigueur, notamment le RGPD</li>
                <li>Maintenir a jour ses informations de compte</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Propriete intellectuelle</h2>
              <p className="text-muted-foreground">
                Tous les elements de la plateforme (logiciels, textes, images, logos) sont proteges
                par le droit de la propriete intellectuelle. L&apos;utilisateur beneficie d&apos;un
                droit d&apos;utilisation non exclusif et non transferable de la plateforme.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Donnees personnelles</h2>
              <p className="text-muted-foreground">
                Le traitement des donnees personnelles est decrit dans notre{' '}
                <a href="/privacy" className="text-primary hover:underline">
                  Politique de confidentialite
                </a>. En utilisant nos services, vous acceptez ce traitement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Responsabilite</h2>
              <p className="text-muted-foreground mb-4">
                Skali Prog s&apos;engage a fournir un service de qualite mais ne peut garantir
                une disponibilite absolue de la plateforme. En cas d&apos;interruption, nous nous
                engageons a retablir le service dans les meilleurs delais.
              </p>
              <p className="text-muted-foreground">
                L&apos;utilisateur est seul responsable de l&apos;utilisation qu&apos;il fait de
                la plateforme et des donnees qu&apos;il y saisit.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Resiliation</h2>
              <p className="text-muted-foreground">
                L&apos;utilisateur peut resilier son abonnement a tout moment. En cas de manquement
                grave aux presentes CGU, Skali Prog se reserve le droit de suspendre ou resilier
                l&apos;acces a la plateforme sans preavis.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Modification des CGU</h2>
              <p className="text-muted-foreground">
                Skali Prog se reserve le droit de modifier les presentes CGU. Les utilisateurs
                seront informes de toute modification par email ou notification dans l&apos;application.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Droit applicable</h2>
              <p className="text-muted-foreground">
                Les presentes CGU sont soumises au droit francais. En cas de litige, les tribunaux
                francais seront seuls competents.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">13. Contact</h2>
              <p className="text-muted-foreground">
                Pour toute question concernant ces CGU, contactez-nous a :{' '}
                <a href="mailto:contact@skaliprog.com" className="text-primary hover:underline">
                  contact@skaliprog.com
                </a>
              </p>
            </section>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
