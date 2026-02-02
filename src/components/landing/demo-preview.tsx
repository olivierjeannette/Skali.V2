'use client';

import { AnimatedSection } from './animated-section';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DemoPreviewSection() {
  return (
    <section id="demo" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-sm font-medium text-primary mb-4 block">
            Apercu
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Une interface{' '}
            <span className="text-muted-foreground">intuitive et moderne</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Decouvrez comment Skali Prog simplifie la gestion quotidienne de
            votre box en quelques clics.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.2} className="relative max-w-5xl mx-auto">
          {/* Browser mockup */}
          <div className="rounded-2xl border bg-card shadow-2xl overflow-hidden">
            {/* Browser header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2 px-4 py-1 rounded-md bg-background text-sm text-muted-foreground">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  app.skaliprog.com
                </div>
              </div>
            </div>

            {/* Screenshot placeholder */}
            <div className="relative aspect-[16/9] bg-gradient-to-br from-primary/5 to-primary/10">
              {/* Placeholder dashboard mockup */}
              <div className="absolute inset-0 p-4 sm:p-8">
                {/* Sidebar mockup */}
                <div className="absolute left-4 sm:left-8 top-4 sm:top-8 bottom-4 sm:bottom-8 w-16 sm:w-48 rounded-lg bg-card/80 backdrop-blur border shadow-sm">
                  <div className="p-3 sm:p-4 space-y-3">
                    <div className="h-8 w-8 sm:w-full rounded bg-primary/20" />
                    <div className="space-y-2 hidden sm:block">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-8 rounded ${
                            i === 1 ? 'bg-primary/30' : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Main content mockup */}
                <div className="absolute left-24 sm:left-60 right-4 sm:right-8 top-4 sm:top-8 bottom-4 sm:bottom-8 rounded-lg bg-card/80 backdrop-blur border shadow-sm p-4 sm:p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="h-6 w-32 sm:w-48 rounded bg-muted" />
                    <div className="h-8 w-24 rounded bg-primary/30" />
                  </div>

                  {/* Stats cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="p-3 sm:p-4 rounded-lg bg-muted/50">
                        <div className="h-3 w-12 sm:w-16 rounded bg-muted mb-2" />
                        <div className="h-6 w-8 sm:w-12 rounded bg-primary/30" />
                      </div>
                    ))}
                  </div>

                  {/* Chart placeholder */}
                  <div className="h-24 sm:h-32 rounded-lg bg-muted/50 flex items-end justify-around p-4">
                    {[40, 65, 45, 80, 55, 70, 60].map((h, i) => (
                      <div
                        key={i}
                        className="w-6 sm:w-8 rounded-t bg-primary/40"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity cursor-pointer group">
                <Button
                  size="lg"
                  className="rounded-full h-16 w-16 shadow-xl group-hover:scale-110 transition-transform"
                >
                  <Play className="h-6 w-6 ml-1" />
                </Button>
              </div>
            </div>
          </div>

          {/* Floating badges */}
          <div className="absolute -right-4 top-1/4 hidden lg:block">
            <AnimatedSection delay={0.5} direction="left">
              <div className="bg-card border rounded-lg shadow-lg p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <svg
                    className="h-5 w-5 text-green-500"
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
                <div>
                  <p className="font-medium text-sm">Nouveau membre</p>
                  <p className="text-xs text-muted-foreground">
                    Marie vient de s&apos;inscrire
                  </p>
                </div>
              </div>
            </AnimatedSection>
          </div>

          <div className="absolute -left-4 bottom-1/4 hidden lg:block">
            <AnimatedSection delay={0.7} direction="right">
              <div className="bg-card border rounded-lg shadow-lg p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <svg
                    className="h-5 w-5 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-sm">Cours complet</p>
                  <p className="text-xs text-muted-foreground">
                    WOD 18h - 20/20 places
                  </p>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
