'use client';

import { useState } from 'react';
import { AnimatedSection } from './animated-section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowRight, Calendar, Mail, Phone } from 'lucide-react';

export function ContactFormSection() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  return (
    <section id="contact" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Left side - Info */}
            <AnimatedSection direction="right">
              <span className="text-sm font-medium text-primary mb-4 block">
                Contact
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Reservez votre{' '}
                <span className="text-muted-foreground">demo gratuite</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Decouvrez comment Skali Prog peut transformer la gestion de
                votre box. Nos experts vous presentent la solution en 30 minutes.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Demo personnalisee</h3>
                    <p className="text-sm text-muted-foreground">
                      30 minutes pour decouvrir les fonctionnalites adaptees a
                      vos besoins.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Reponse rapide</h3>
                    <p className="text-sm text-muted-foreground">
                      Nous vous recontactons sous 24h pour planifier votre demo.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Sans engagement</h3>
                    <p className="text-sm text-muted-foreground">
                      Aucune obligation d&apos;achat. Decouvrez la solution sans
                      pression.
                    </p>
                  </div>
                </div>
              </div>
            </AnimatedSection>

            {/* Right side - Form */}
            <AnimatedSection delay={0.2} direction="left">
              <div className="bg-card border rounded-2xl p-6 sm:p-8 shadow-lg">
                {isSubmitted ? (
                  <div className="text-center py-8">
                    <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="h-8 w-8 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold mb-2">Demande envoyee !</h3>
                    <p className="text-muted-foreground">
                      Nous vous recontactons sous 24h pour planifier votre demo.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Prenom</Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          placeholder="Jean"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Nom</Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          placeholder="Dupont"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email professionnel</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="jean@mabox.fr"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Telephone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="06 12 34 56 78"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="boxName">Nom de votre salle</Label>
                      <Input
                        id="boxName"
                        name="boxName"
                        placeholder="CrossFit Paris"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="members">Nombre de membres</Label>
                      <Input
                        id="members"
                        name="members"
                        type="number"
                        placeholder="150"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message (optionnel)</Label>
                      <Textarea
                        id="message"
                        name="message"
                        placeholder="Dites-nous en plus sur vos besoins..."
                        rows={3}
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full group shadow-lg shadow-primary/25"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        'Envoi en cours...'
                      ) : (
                        <>
                          Reserver ma demo gratuite
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      En soumettant ce formulaire, vous acceptez d&apos;etre
                      contacte par notre equipe commerciale.
                    </p>
                  </form>
                )}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </div>
    </section>
  );
}
