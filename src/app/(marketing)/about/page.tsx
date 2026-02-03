import { AnimatedSection } from '@/components/landing';
import { Target, Users, Zap, Heart } from 'lucide-react';

export const metadata = {
  title: 'A propos - Skali Prog',
  description: 'Decouvrez l\'histoire de Skali Prog, la plateforme de gestion pour les box CrossFit et salles de fitness.',
};

export default function AboutPage() {
  const values = [
    {
      icon: Target,
      title: 'Mission',
      description: 'Simplifier la gestion des salles de sport pour que les owners puissent se concentrer sur ce qui compte vraiment : leurs membres.',
    },
    {
      icon: Users,
      title: 'Communaute',
      description: 'Nous construisons avec et pour la communaute CrossFit et fitness. Chaque fonctionnalite est pensee par des owners, pour des owners.',
    },
    {
      icon: Zap,
      title: 'Innovation',
      description: 'Nous utilisons les dernieres technologies pour offrir une experience fluide et des outils performants.',
    },
    {
      icon: Heart,
      title: 'Passion',
      description: 'Nous sommes des passionnes de fitness et nous comprenons les defis quotidiens des gerants de salles.',
    },
  ];

  return (
    <div className="py-24">
      <div className="container mx-auto px-4">
        {/* Hero */}
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-20">
          <span className="text-sm font-medium text-primary mb-4 block">
            A propos
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            Construire l&apos;avenir de la{' '}
            <span className="text-muted-foreground">gestion fitness</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Skali Prog est ne de la frustration d&apos;un owner de box CrossFit face aux
            outils existants. Trop complexes, trop chers, pas adaptes. Nous avons
            decide de creer la solution que nous aurions voulu avoir.
          </p>
        </AnimatedSection>

        {/* Story */}
        <AnimatedSection delay={0.1} className="max-w-4xl mx-auto mb-20">
          <div className="bg-card border rounded-2xl p-8 sm:p-12">
            <h2 className="text-2xl font-bold mb-6">Notre histoire</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Tout a commence en 2023, dans une box CrossFit du Nord de la France.
                Comme beaucoup d&apos;owners, nous jonglions entre plusieurs outils :
                un tableur Excel pour les membres, une app pour le planning, une autre
                pour les paiements...
              </p>
              <p>
                Face a cette complexite, nous avons decide de creer Skali Prog : une
                plateforme unique qui regroupe tout ce dont un owner a besoin. Gestion
                des membres, planning, WODs, paiements, automatisations - tout en un
                seul endroit.
              </p>
              <p>
                Aujourd&apos;hui, Skali Prog accompagne plus de 50 box et salles de
                fitness en France, et continue d&apos;evoluer grace aux retours de
                notre communaute d&apos;utilisateurs.
              </p>
            </div>
          </div>
        </AnimatedSection>

        {/* Values */}
        <div className="mb-20">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-3xl font-bold">Nos valeurs</h2>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <AnimatedSection key={value.title} delay={index * 0.1}>
                <div className="text-center p-6">
                  <div className="inline-flex p-3 rounded-xl bg-primary/10 text-primary mb-4">
                    <value.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {value.description}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>

        {/* Contact CTA */}
        <AnimatedSection delay={0.4} className="text-center">
          <div className="bg-muted/50 rounded-2xl p-8 sm:p-12 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Une question ?</h2>
            <p className="text-muted-foreground mb-6">
              Notre equipe est disponible pour repondre a toutes vos questions.
            </p>
            <a
              href="/#contact"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Nous contacter
            </a>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
