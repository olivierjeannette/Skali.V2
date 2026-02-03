import { AnimatedSection } from '@/components/landing';

export const metadata = {
  title: 'Mentions legales - Skali Prog',
  description: 'Mentions legales de Skali Prog.',
};

export default function LegalPage() {
  return (
    <div className="py-24">
      <div className="container mx-auto px-4">
        <AnimatedSection className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Mentions legales</h1>

          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Editeur du site</h2>
              <p className="text-muted-foreground mb-4">
                Le site skaliprog.com est edite par :
              </p>
              <ul className="list-none space-y-2 text-muted-foreground">
                <li><strong>Raison sociale :</strong> Skali Prog</li>
                <li><strong>Forme juridique :</strong> [A completer]</li>
                <li><strong>Capital social :</strong> [A completer]</li>
                <li><strong>Siege social :</strong> [Adresse a completer]</li>
                <li><strong>SIRET :</strong> [A completer]</li>
                <li><strong>RCS :</strong> [A completer]</li>
                <li><strong>TVA intracommunautaire :</strong> [A completer]</li>
                <li><strong>Email :</strong> contact@skaliprog.com</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Directeur de la publication</h2>
              <p className="text-muted-foreground">
                Le directeur de la publication est [Nom a completer], en qualite de [Fonction].
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. Hebergement</h2>
              <p className="text-muted-foreground mb-4">
                Le site est heberge par :
              </p>
              <ul className="list-none space-y-2 text-muted-foreground">
                <li><strong>Hebergeur :</strong> Vercel Inc.</li>
                <li><strong>Adresse :</strong> 340 S Lemon Ave #4133, Walnut, CA 91789, USA</li>
                <li><strong>Site web :</strong> vercel.com</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Propriete intellectuelle</h2>
              <p className="text-muted-foreground">
                L&apos;ensemble du contenu de ce site (textes, images, logos, icones, sons, logiciels, etc.)
                est la propriete exclusive de Skali Prog ou de ses partenaires. Toute reproduction,
                representation, modification, publication ou adaptation de tout ou partie des elements
                du site est interdite sans autorisation ecrite prealable.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Donnees personnelles</h2>
              <p className="text-muted-foreground">
                Pour toute information concernant le traitement de vos donnees personnelles,
                veuillez consulter notre{' '}
                <a href="/privacy" className="text-primary hover:underline">
                  Politique de confidentialite
                </a>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Cookies</h2>
              <p className="text-muted-foreground">
                Pour en savoir plus sur l&apos;utilisation des cookies, consultez notre{' '}
                <a href="/cookies" className="text-primary hover:underline">
                  Politique de cookies
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Contact</h2>
              <p className="text-muted-foreground">
                Pour toute question, vous pouvez nous contacter a l&apos;adresse suivante :{' '}
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
