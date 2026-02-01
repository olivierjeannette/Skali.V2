'use client';

import { useState, useEffect } from 'react';
import { Cookie, Settings, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const COOKIE_CONSENT_KEY = 'skali-cookie-consent';

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  consentDate: string;
}

const defaultPreferences: CookiePreferences = {
  essential: true, // Always required
  analytics: false,
  marketing: false,
  consentDate: '',
};

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences);

  useEffect(() => {
    // Check if user has already consented
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) {
      // Show banner after a short delay
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    } else {
      setPreferences(JSON.parse(stored));
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    const toSave = { ...prefs, consentDate: new Date().toISOString() };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(toSave));
    setPreferences(toSave);
    setShowBanner(false);
    setShowSettings(false);

    // Trigger analytics initialization if accepted
    if (prefs.analytics) {
      // Initialize analytics (e.g., Google Analytics, Plausible, etc.)
      console.log('Analytics cookies accepted');
    }

    if (prefs.marketing) {
      // Initialize marketing cookies
      console.log('Marketing cookies accepted');
    }
  };

  const acceptAll = () => {
    savePreferences({ essential: true, analytics: true, marketing: true, consentDate: '' });
  };

  const rejectAll = () => {
    savePreferences({ essential: true, analytics: false, marketing: false, consentDate: '' });
  };

  const saveCustom = () => {
    savePreferences(preferences);
  };

  if (!showBanner && !showSettings) {
    return null;
  }

  return (
    <>
      {/* Cookie Banner */}
      {showBanner && !showSettings && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
          <Card className="mx-auto max-w-4xl shadow-lg border-2">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row gap-4 md:items-center">
                <div className="flex items-start gap-3 flex-1">
                  <Cookie className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-base">Nous utilisons des cookies</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ce site utilise des cookies pour ameliorer votre experience.
                      Les cookies essentiels sont necessaires au fonctionnement du site.
                      Vous pouvez choisir d&apos;accepter ou de refuser les cookies optionnels.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSettings(true)}
                    className="gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Personnaliser
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={rejectAll}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Refuser
                  </Button>
                  <Button size="sm" onClick={acceptAll} className="gap-2">
                    <Check className="h-4 w-4" />
                    Tout accepter
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5" />
              Preferences de cookies
            </DialogTitle>
            <DialogDescription>
              Gerez vos preferences de cookies. Les cookies essentiels sont toujours actifs
              car necessaires au fonctionnement du site.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Essential Cookies */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label className="font-medium">Cookies essentiels</Label>
                <p className="text-sm text-muted-foreground">
                  Necessaires au fonctionnement du site (authentification, preferences).
                </p>
              </div>
              <Switch checked={true} disabled />
            </div>

            {/* Analytics Cookies */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-lg border">
              <div className="space-y-0.5">
                <Label className="font-medium">Cookies analytiques</Label>
                <p className="text-sm text-muted-foreground">
                  Permettent de mesurer la frequentation et d&apos;ameliorer le site.
                </p>
              </div>
              <Switch
                checked={preferences.analytics}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, analytics: checked }))
                }
              />
            </div>

            {/* Marketing Cookies */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-lg border">
              <div className="space-y-0.5">
                <Label className="font-medium">Cookies marketing</Label>
                <p className="text-sm text-muted-foreground">
                  Permettent de personnaliser les publicites et contenus.
                </p>
              </div>
              <Switch
                checked={preferences.marketing}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, marketing: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={rejectAll} className="sm:flex-1">
              Tout refuser
            </Button>
            <Button onClick={saveCustom} className="sm:flex-1">
              Enregistrer mes choix
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Button to reopen cookie settings (for footer link)
 */
export function CookieSettingsButton({ className }: { className?: string }) {
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) {
      setPreferences(JSON.parse(stored));
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    const toSave = { ...prefs, consentDate: new Date().toISOString() };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(toSave));
    setPreferences(toSave);
    setShowSettings(false);
  };

  return (
    <>
      <button
        onClick={() => setShowSettings(true)}
        className={className || 'text-sm text-muted-foreground hover:underline'}
      >
        Gerer les cookies
      </button>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5" />
              Preferences de cookies
            </DialogTitle>
            <DialogDescription>
              Gerez vos preferences de cookies.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label className="font-medium">Cookies essentiels</Label>
                <p className="text-sm text-muted-foreground">
                  Necessaires au fonctionnement du site.
                </p>
              </div>
              <Switch checked={true} disabled />
            </div>

            <div className="flex items-start justify-between gap-4 p-3 rounded-lg border">
              <div className="space-y-0.5">
                <Label className="font-medium">Cookies analytiques</Label>
                <p className="text-sm text-muted-foreground">
                  Mesure de frequentation.
                </p>
              </div>
              <Switch
                checked={preferences.analytics}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, analytics: checked }))
                }
              />
            </div>

            <div className="flex items-start justify-between gap-4 p-3 rounded-lg border">
              <div className="space-y-0.5">
                <Label className="font-medium">Cookies marketing</Label>
                <p className="text-sm text-muted-foreground">
                  Personnalisation des publicites.
                </p>
              </div>
              <Switch
                checked={preferences.marketing}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, marketing: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => savePreferences(preferences)}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
