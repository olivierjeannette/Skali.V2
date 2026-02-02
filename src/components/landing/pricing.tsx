'use client';

import { AnimatedSection } from './animated-section';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import Link from 'next/link';

export function PricingSection() {
  const plans = [
    {
      name: 'Starter',
      description: 'Pour les petites structures',
      price: '49',
      period: '/mois',
      features: [
        'Jusqu\'a 100 membres',
        'Gestion des cours',
        'Planning basique',
        'App membre PWA',
        'Support email',
      ],
      cta: 'Commencer l\'essai',
      popular: false,
    },
    {
      name: 'Pro',
      description: 'Pour les box en croissance',
      price: '99',
      period: '/mois',
      features: [
        'Membres illimites',
        'Toutes les fonctionnalites Starter',
        'Automatisations',
        'Analytics avances',
        'Paiements Stripe',
        'Support prioritaire',
      ],
      cta: 'Reserver une demo',
      popular: true,
    },
    {
      name: 'Enterprise',
      description: 'Pour les reseaux de salles',
      price: 'Sur mesure',
      period: '',
      features: [
        'Multi-sites',
        'Toutes les fonctionnalites Pro',
        'API personnalisee',
        'Onboarding dedie',
        'SLA garanti',
        'Account manager',
      ],
      cta: 'Nous contacter',
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-24">
      <div className="container mx-auto px-4">
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-sm font-medium text-primary mb-4 block">
            Tarifs
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Des tarifs{' '}
            <span className="text-muted-foreground">simples et transparents</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Pas de frais caches, pas d&apos;engagement. Changez de plan ou
            annulez a tout moment.
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <AnimatedSection key={plan.name} delay={index * 0.1}>
              <div
                className={`relative h-full flex flex-col p-6 rounded-2xl border ${
                  plan.popular
                    ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10'
                    : 'bg-card'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                      Le plus populaire
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm">
                    {plan.description}
                  </p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground">{plan.period}</span>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  variant={plan.popular ? 'default' : 'outline'}
                  className={`w-full ${
                    plan.popular ? 'shadow-lg shadow-primary/25' : ''
                  }`}
                >
                  <Link href="#contact">{plan.cta}</Link>
                </Button>
              </div>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection delay={0.4} className="text-center mt-12">
          <p className="text-muted-foreground">
            Tous les plans incluent un essai gratuit de 14 jours.{' '}
            <Link href="#contact" className="text-primary hover:underline">
              Contactez-nous
            </Link>{' '}
            pour un devis personnalise.
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
