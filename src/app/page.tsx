import {
  LandingHeader,
  HeroSection,
  SocialProofSection,
  FeaturesSection,
  DemoPreviewSection,
  PricingSection,
  TestimonialsSection,
  FAQSection,
  ContactFormSection,
  LandingFooter,
} from '@/components/landing';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader />
      <main>
        <HeroSection />
        <SocialProofSection />
        <FeaturesSection />
        <DemoPreviewSection />
        <PricingSection />
        <TestimonialsSection />
        <FAQSection />
        <ContactFormSection />
      </main>
      <LandingFooter />
    </div>
  );
}
