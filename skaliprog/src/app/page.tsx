import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Calendar, Dumbbell, Tv, Smartphone, BarChart3 } from 'lucide-react'

const features = [
  {
    icon: Users,
    title: 'Gestion des adherents',
    description: 'CRM complet pour gerer vos membres, abonnements et documents.',
  },
  {
    icon: Calendar,
    title: 'Planning & Reservations',
    description: 'Calendrier interactif avec inscriptions en ligne et listes d\'attente.',
  },
  {
    icon: Dumbbell,
    title: 'Builder de seances',
    description: 'Creez vos WODs facilement avec notre editeur intuitif.',
  },
  {
    icon: Tv,
    title: 'Affichage TV',
    description: 'Affichez les seances sur vos ecrans avec synchronisation temps reel.',
  },
  {
    icon: Smartphone,
    title: 'App mobile',
    description: 'Vos adherents reservent et consultent les WODs depuis leur telephone.',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'Suivez vos KPIs: frequentation, CA, retention et plus.',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
        <nav className="relative container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
              <span className="text-white font-bold text-sm">SP</span>
            </div>
            <span className="font-bold text-xl">Skali Prog</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Connexion</Button>
            </Link>
            <Link href="/register">
              <Button>Demarrer</Button>
            </Link>
          </div>
        </nav>

        <div className="relative container mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            <span className="block">La solution complete pour</span>
            <span className="block bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              votre salle de sport
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Gerez vos adherents, planifiez vos cours, creez vos seances et communiquez avec vos membres.
            Tout-en-un, simple et efficace.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/register">
              <Button size="lg" className="px-8">
                Essayer gratuitement
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="px-8">
                Voir la demo
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold">Tout ce dont vous avez besoin</h2>
          <p className="mt-4 text-muted-foreground">
            Une plateforme pensee pour les salles de CrossFit et functional fitness
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="group hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-primary to-primary-dark py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white">Pret a digitaliser votre salle ?</h2>
          <p className="mt-4 text-primary-foreground/80">
            Rejoignez les salles qui utilisent deja Skali Prog
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="mt-8">
              Commencer maintenant
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Skali Prog. Developpe avec passion pour les coachs.</p>
        </div>
      </footer>
    </div>
  )
}
