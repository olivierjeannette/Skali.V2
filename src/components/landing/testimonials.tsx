'use client';

import { AnimatedSection } from './animated-section';
import { Star } from 'lucide-react';

export function TestimonialsSection() {
  const testimonials = [
    {
      quote:
        "Skali Prog a completement transforme la gestion de notre box. On a gagne un temps fou sur l'administratif et nos membres adorent l'app.",
      author: 'Thomas Durand',
      role: 'Owner',
      company: 'La Skali',
      url: 'laskali.eu',
      avatar: 'T',
      rating: 5,
    },
    {
      quote:
        "L'automatisation des emails et rappels nous a permis de reduire le no-show de 40%. Le support est super reactif en plus.",
      author: 'Marie Lambert',
      role: 'Manager',
      company: 'CrossFit Lille',
      url: '#',
      avatar: 'M',
      rating: 5,
    },
    {
      quote:
        "Apres avoir teste 3 autres solutions, Skali Prog est de loin la plus complete et la plus simple a utiliser. Mes coachs l'ont adoptee en 2 jours.",
      author: 'Pierre Martin',
      role: 'Owner',
      company: 'Box Factory',
      url: '#',
      avatar: 'P',
      rating: 5,
    },
  ];

  return (
    <section id="testimonials" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-sm font-medium text-primary mb-4 block">
            Temoignages
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ce que nos clients{' '}
            <span className="text-muted-foreground">disent de nous</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Decouvrez pourquoi les owners de box font confiance a Skali Prog
            pour gerer leur activite.
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <AnimatedSection key={testimonial.author} delay={index * 0.1}>
              <div className="h-full flex flex-col p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="text-foreground mb-6 flex-grow">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-medium">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role} @{' '}
                      {testimonial.url !== '#' ? (
                        <a
                          href={`https://${testimonial.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {testimonial.company}
                        </a>
                      ) : (
                        testimonial.company
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
