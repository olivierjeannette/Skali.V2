'use client';

import { AnimatedSection } from './animated-section';
import { AnimatedCounter } from './animated-counter';

export function SocialProofSection() {
  const stats = [
    { value: 50, suffix: '+', label: 'Box partenaires' },
    { value: 12000, suffix: '+', label: 'Membres geres' },
    { value: 98, suffix: '%', label: 'Satisfaction client' },
    { value: 24, suffix: '/7', label: 'Support disponible' },
  ];

  const logos = [
    { name: 'La Skali', url: 'laskali.eu' },
    { name: 'CrossFit Lille', url: '#' },
    { name: 'Box Factory', url: '#' },
    { name: 'Functional Training', url: '#' },
    { name: 'Fit & Strong', url: '#' },
  ];

  return (
    <section className="py-20 border-y bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {stats.map((stat, index) => (
            <AnimatedSection
              key={stat.label}
              delay={index * 0.1}
              className="text-center"
            >
              <div className="text-3xl sm:text-4xl font-bold">
                <AnimatedCounter
                  end={stat.value}
                  suffix={stat.suffix}
                  duration={2}
                />
              </div>
              <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                {stat.label}
              </p>
            </AnimatedSection>
          ))}
        </div>

        {/* Logos */}
        <AnimatedSection delay={0.4} className="text-center">
          <p className="text-sm text-muted-foreground mb-8">
            Ils nous font confiance
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {logos.map((logo) => (
              <div
                key={logo.name}
                className="group flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {logo.name.charAt(0)}
                </div>
                <span className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {logo.name}
                </span>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
