import { AnimatedSection } from '@/components/landing';

export const metadata = {
  title: 'Politique de cookies - Skali Prog',
  description: 'Politique de cookies de Skali Prog.',
};

export default function CookiesPage() {
  return (
    <div className="py-24">
      <div className="container mx-auto px-4">
        <AnimatedSection className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Politique de cookies</h1>
          <p className="text-muted-foreground mb-8">Derniere mise a jour : Fevrier 2026</p>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Qu&apos;est-ce qu&apos;un cookie ?</h2>
              <p className="text-muted-foreground">
                Un cookie est un petit fichier texte depose sur votre terminal (ordinateur,
                smartphone, tablette) lors de la visite d&apos;un site web. Il permet au site de
                memoriser des informations sur votre visite, comme vos preferences, pour
                faciliter votre navigation.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Types de cookies utilises</h2>

              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Cookies strictement necessaires</h3>
                <p className="text-muted-foreground mb-2">
                  Ces cookies sont essentiels au fonctionnement du site. Ils permettent notamment :
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>La gestion de votre session et authentification</li>
                  <li>La memorisation de vos preferences de consentement</li>
                  <li>La securite de votre navigation</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Duree :</strong> Session ou jusqu&apos;a 1 an
                </p>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Cookies de performance</h3>
                <p className="text-muted-foreground mb-2">
                  Ces cookies nous aident a comprendre comment les visiteurs utilisent notre site :
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>Pages visitees et temps passe</li>
                  <li>Erreurs rencontrees</li>
                  <li>Performance du site</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Duree :</strong> Jusqu&apos;a 13 mois
                </p>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Cookies fonctionnels</h3>
                <p className="text-muted-foreground mb-2">
                  Ces cookies permettent d&apos;ameliorer votre experience :
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>Memorisation de vos preferences (langue, theme)</li>
                  <li>Personnalisation de l&apos;interface</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Duree :</strong> Jusqu&apos;a 1 an
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Liste des cookies utilises</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Nom</th>
                      <th className="text-left py-3 px-4 font-semibold">Finalite</th>
                      <th className="text-left py-3 px-4 font-semibold">Duree</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b">
                      <td className="py-3 px-4">sb-*</td>
                      <td className="py-3 px-4">Authentification Supabase</td>
                      <td className="py-3 px-4">Session</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4">cookie-consent</td>
                      <td className="py-3 px-4">Memorise vos choix de cookies</td>
                      <td className="py-3 px-4">1 an</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4">theme</td>
                      <td className="py-3 px-4">Preference de theme (clair/sombre)</td>
                      <td className="py-3 px-4">1 an</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4">locale</td>
                      <td className="py-3 px-4">Preference de langue</td>
                      <td className="py-3 px-4">1 an</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Gestion des cookies</h2>
              <p className="text-muted-foreground mb-4">
                Vous pouvez a tout moment modifier vos preferences en matiere de cookies :
              </p>

              <h3 className="text-lg font-medium mb-2">Via notre bandeau de consentement</h3>
              <p className="text-muted-foreground mb-4">
                Lors de votre premiere visite, un bandeau vous permet d&apos;accepter ou refuser
                les differentes categories de cookies. Vous pouvez modifier ces choix a tout
                moment en cliquant sur le lien &quot;Gerer les cookies&quot; en bas de page.
              </p>

              <h3 className="text-lg font-medium mb-2">Via votre navigateur</h3>
              <p className="text-muted-foreground mb-4">
                Vous pouvez egalement configurer votre navigateur pour accepter ou refuser
                les cookies. Voici les liens vers les instructions des principaux navigateurs :
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>
                  <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Google Chrome
                  </a>
                </li>
                <li>
                  <a href="https://support.mozilla.org/fr/kb/cookies-informations-sites-enregistrent" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Mozilla Firefox
                  </a>
                </li>
                <li>
                  <a href="https://support.apple.com/fr-fr/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Safari
                  </a>
                </li>
                <li>
                  <a href="https://support.microsoft.com/fr-fr/microsoft-edge/supprimer-les-cookies-dans-microsoft-edge" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Microsoft Edge
                  </a>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Consequences du refus des cookies</h2>
              <p className="text-muted-foreground">
                Si vous refusez les cookies strictement necessaires, certaines fonctionnalites
                du site pourraient ne pas fonctionner correctement. Le refus des autres
                categories de cookies n&apos;affecte pas l&apos;utilisation de base du site mais
                peut limiter certaines fonctionnalites de personnalisation.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Mise a jour de cette politique</h2>
              <p className="text-muted-foreground">
                Cette politique de cookies peut etre mise a jour periodiquement. La date de
                derniere mise a jour est indiquee en haut de cette page. Nous vous invitons
                a la consulter regulierement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Contact</h2>
              <p className="text-muted-foreground">
                Pour toute question concernant notre utilisation des cookies, contactez-nous a :{' '}
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
