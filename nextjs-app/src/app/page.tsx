import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dumbbell, Users, Calendar, BarChart3, Zap, Shield } from 'lucide-react';

export default function HomePage() {
  const features = [
    {
      icon: Users,
      title: 'Gestion des membres',
      description: 'Gerez vos adherents, leurs abonnements et leur progression en un seul endroit.',
    },
    {
      icon: Calendar,
      title: 'Planning intelligent',
      description: 'Planifiez vos cours, gerez les reservations et optimisez vos creneaux.',
    },
    {
      icon: Dumbbell,
      title: 'Workouts & Scores',
      description: 'Publiez vos WODs, suivez les performances et motivez avec des leaderboards.',
    },
    {
      icon: BarChart3,
      title: 'Analytics avances',
      description: "Analysez la frequentation, les revenus et la retention de vos membres.",
    },
    {
      icon: Zap,
      title: 'Automatisation',
      description: 'Automatisez emails, rappels et communications avec notre workflow builder.',
    },
    {
      icon: Shield,
      title: 'Multi-tenant securise',
      description: 'Chaque salle a son espace isole avec ses propres donnees et parametres.',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              S
            </div>
            <span className="text-xl font-bold">Skali Prog</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Connexion</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Commencer</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          La plateforme complete pour{' '}
          <span className="text-primary">votre box</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Gerez vos membres, planifiez vos cours, suivez les performances et automatisez
          votre communication. Tout en un seul outil concu pour les salles CrossFit et
          Functional Fitness.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/register">Essayer gratuitement</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="#features">Decouvrir</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t bg-muted/50 py-24">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Tout ce dont vous avez besoin</h2>
            <p className="mt-4 text-muted-foreground">
              Une solution complete pour gerer votre salle de sport
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border bg-background p-6"
              >
                <feature.icon className="h-10 w-10 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-24 text-center">
        <h2 className="text-3xl font-bold">Pret a transformer votre salle?</h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Rejoignez les salles qui utilisent Skali Prog pour simplifier leur gestion
          et offrir une meilleure experience a leurs membres.
        </p>
        <Button size="lg" className="mt-8" asChild>
          <Link href="/register">Creer mon compte gratuitement</Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 Skali Prog. Tous droits reserves.</p>
        </div>
      </footer>
    </div>
  );
}
