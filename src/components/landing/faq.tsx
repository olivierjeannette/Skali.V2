'use client';

import { AnimatedSection } from './animated-section';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export function FAQSection() {
  const faqs = [
    {
      question: 'Combien de temps dure l\'essai gratuit ?',
      answer:
        'L\'essai gratuit dure 14 jours avec acces a toutes les fonctionnalites. Aucune carte bancaire n\'est requise pour commencer.',
    },
    {
      question: 'Puis-je migrer mes donnees depuis une autre solution ?',
      answer:
        'Oui, nous proposons un service de migration gratuit pour les plans Pro et Enterprise. Notre equipe vous accompagne pour importer vos membres, historiques et donnees.',
    },
    {
      question: 'Est-ce que mes membres peuvent utiliser l\'app sur mobile ?',
      answer:
        'Oui, Skali Prog inclut une Progressive Web App (PWA) que vos membres peuvent installer sur leur telephone. Ils peuvent consulter le planning, s\'inscrire aux cours et voir leurs performances.',
    },
    {
      question: 'Comment fonctionne la facturation ?',
      answer:
        'La facturation est mensuelle sans engagement. Vous pouvez changer de plan ou annuler a tout moment. Pour les paiements annuels, beneficiez de 2 mois offerts.',
    },
    {
      question: 'Est-ce que la solution est conforme RGPD ?',
      answer:
        'Oui, Skali Prog est 100% conforme RGPD. Vos donnees sont hebergees en Europe et vous gardez le controle total sur les donnees de vos membres.',
    },
    {
      question: 'Quel support est disponible ?',
      answer:
        'Tous les plans incluent un support par email. Les plans Pro et Enterprise beneficient d\'un support prioritaire avec temps de reponse garanti et acces a notre chat en direct.',
    },
    {
      question: 'Puis-je personnaliser l\'application avec mon logo ?',
      answer:
        'Oui, vous pouvez personnaliser l\'application avec votre logo, vos couleurs et votre nom de domaine personnalise (plans Pro et Enterprise).',
    },
  ];

  return (
    <section id="faq" className="py-24">
      <div className="container mx-auto px-4">
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-sm font-medium text-primary mb-4 block">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Questions{' '}
            <span className="text-muted-foreground">frequentes</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Vous avez des questions ? Nous avons les reponses.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.2} className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left hover:text-primary transition-colors">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </AnimatedSection>
      </div>
    </section>
  );
}
