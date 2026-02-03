import { LandingHeader, LandingFooter } from '@/components/landing';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader />
      <main className="flex-1 pt-16">{children}</main>
      <LandingFooter />
    </div>
  );
}
