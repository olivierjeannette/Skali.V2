"use client";

import { useState, useEffect } from "react";
import { Download, X, Smartphone, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isIOS, isPwaInstalled } from "@/lib/push-notifications";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface InstallPromptProps {
  className?: string;
}

/**
 * Composant pour afficher un prompt d'installation PWA
 *
 * - Sur Android/Chrome: Utilise l'événement beforeinstallprompt
 * - Sur iOS: Affiche des instructions manuelles
 */
export function InstallPrompt({ className = "" }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const [isPwa, setIsPwa] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Vérifier si on est sur iOS
    setIsIosDevice(isIOS());

    // Vérifier si déjà installé
    setIsPwa(isPwaInstalled());

    // Vérifier si l'utilisateur a déjà fermé le prompt
    const wasDismissed = localStorage.getItem("pwa-install-dismissed");
    if (wasDismissed) {
      const dismissedTime = parseInt(wasDismissed, 10);
      // Ne pas re-montrer pendant 7 jours
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }

    // Écouter l'événement beforeinstallprompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Sur iOS, montrer le prompt après un délai si non installé
    if (isIOS() && !isPwaInstalled() && !dismissed) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000); // Afficher après 5 secondes

      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [dismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Afficher le prompt d'installation natif
    await deferredPrompt.prompt();

    // Attendre la réponse de l'utilisateur
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("[PWA] Installation acceptée");
    } else {
      console.log("[PWA] Installation refusée");
    }

    // Réinitialiser
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  // Ne rien afficher si:
  // - Déjà installé en PWA
  // - L'utilisateur a fermé le prompt
  // - Le prompt n'est pas prêt
  if (isPwa || dismissed || !showPrompt) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-card border rounded-lg shadow-lg p-4 z-50 ${className}`}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        aria-label="Fermer"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">Installer Skali Prog</h3>

          {isIosDevice ? (
            // Instructions iOS
            <div className="mt-1">
              <p className="text-xs text-muted-foreground mb-2">
                Pour installer l&apos;app sur votre iPhone ou iPad:
              </p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li className="flex items-center gap-1">
                  Appuyez sur <Share className="h-3 w-3 inline mx-0.5" /> Partager
                </li>
                <li>Sélectionnez &quot;Ajouter à l&apos;écran d&apos;accueil&quot;</li>
                <li>Appuyez sur &quot;Ajouter&quot;</li>
              </ol>
            </div>
          ) : (
            // Bouton d'installation Android/Desktop
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-2">
                Installez l&apos;app pour un accès rapide et des notifications.
              </p>
              <Button onClick={handleInstall} size="sm" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Installer
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InstallPrompt;
