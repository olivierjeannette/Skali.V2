'use client';

import { AnimatedSection } from './animated-section';
import {
  Users,
  Calendar,
  Dumbbell,
  BarChart3,
  Zap,
  Shield,
  CreditCard,
  Bell,
  Smartphone,
} from 'lucide-react';

export function FeaturesSection() {
  const features = [
    {
      icon: Users,
      title: 'Gestion des membres',
      description:
        'Gerez vos adherents, leurs abonnements, contrats et progression en un seul endroit. Import/export facile.',
      color: 'bg-blue-500/10 text-blue-500',
    },
    {
      icon: Calendar,
      title: 'Planning intelligent',
      description:
        'Planifiez vos cours, gerez les reservations avec limites de places et optimisez vos creneaux automatiquement.',
      color: 'bg-green-500/10 text-green-500',
    },
    {
      icon: Dumbbell,
      title: 'Workouts & Scores',
      description:
        'Publiez vos WODs, suivez les performances individuelles et motivez avec des leaderboards temps reel.',
      color: 'bg-orange-500/10 text-orange-500',
    },
    {
      icon: BarChart3,
      title: 'Analytics avances',
      description:
        'Analysez la frequentation, les revenus, le churn et la retention. Tableaux de bord personnalisables.',
      color: 'bg-purple-500/10 text-purple-500',
    },
    {
      icon: Zap,
      title: 'Automatisation',
      description:
        'Automatisez emails, rappels anniversaires, relances et communications avec notre workflow builder.',
      color: 'bg-yellow-500/10 text-yellow-500',
    },
    {
      icon: CreditCard,
      title: 'Paiements integres',
      description:
        'Gerez les abonnements, prelevements automatiques et factures. Integration Stripe native.',
      color: 'bg-pink-500/10 text-pink-500',
    },
    {
      icon: Smartphone,
      title: 'App mobile PWA',
      description:
        'Vos membres acceent a leur espace depuis leur telephone. Notifications push incluses.',
      color: 'bg-cyan-500/10 text-cyan-500',
    },
    {
      icon: Bell,
      title: 'Notifications',
      description:
        'Alertes en temps reel pour les inscriptions, annulations et evenements importants.',
      color: 'bg-red-500/10 text-red-500',
    },
    {
      icon: Shield,
      title: 'Multi-tenant securise',
      description:
        'Chaque salle a son espace isole avec ses propres donnees. RGPD compliant.',
      color: 'bg-indigo-500/10 text-indigo-500',
    },
  ];

  return (
    <section id="features" className="py-24">
      <div className="container mx-auto px-4">
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-sm font-medium text-primary mb-4 block">
            Fonctionnalites
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Tout ce dont vous avez besoin,{' '}
            <span className="text-muted-foreground">rien de superflu</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Une solution complete pensee par des owners de box, pour des owners
            de box. Chaque fonctionnalite a ete concue pour vous faire gagner du
            temps.
          </p>
        </AnimatedSection>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <AnimatedSection
              key={feature.title}
              delay={index * 0.05}
              className="group"
            >
              <div className="h-full p-6 rounded-2xl border bg-card hover:bg-muted/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div
                  className={`inline-flex p-3 rounded-xl ${feature.color} mb-4`}
                >
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
