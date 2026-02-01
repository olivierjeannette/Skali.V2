"use client";

import { Bell, BellOff, AlertCircle, Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PushNotificationToggleProps {
  className?: string;
  showDescription?: boolean;
}

/**
 * Composant pour activer/désactiver les push notifications
 */
export function PushNotificationToggle({
  className = "",
  showDescription = true,
}: PushNotificationToggleProps) {
  const {
    isSupported,
    isEnabled,
    permission,
    isLoading,
    error,
    canUsePush,
    isIosDevice,
    isPwa,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const handleToggle = async () => {
    try {
      if (isEnabled) {
        await unsubscribe();
      } else {
        await subscribe();
      }
    } catch (err) {
      // L'erreur est déjà gérée dans le hook
      console.error("Erreur toggle notifications:", err);
    }
  };

  // Non supporté
  if (!isSupported) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <BellOff className="h-4 w-4" />
          <span className="text-sm">Notifications non supportées</span>
        </div>
        {showDescription && (
          <p className="text-xs text-muted-foreground">
            Votre navigateur ne supporte pas les notifications push.
          </p>
        )}
      </div>
    );
  }

  // iOS sans PWA
  if (isIosDevice && !isPwa && !canUsePush) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Bell className="h-4 w-4" />
          <span className="text-sm">Notifications push</span>
        </div>
        {showDescription && (
          <Alert variant="default" className="bg-amber-500/10 border-amber-500/20">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-xs">
              Pour recevoir des notifications sur iOS, ajoutez cette app à votre écran d&apos;accueil.
              <br />
              <span className="font-medium">
                Appuyez sur le bouton Partager, puis &quot;Ajouter à l&apos;écran d&apos;accueil&quot;.
              </span>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  // Permission refusée
  if (permission === "denied") {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <BellOff className="h-4 w-4" />
          <span className="text-sm">Notifications bloquées</span>
        </div>
        {showDescription && (
          <p className="text-xs text-muted-foreground">
            Les notifications ont été bloquées. Pour les réactiver, modifiez les paramètres de votre navigateur.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isEnabled ? (
            <Bell className="h-4 w-4 text-primary" />
          ) : (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          )}
          <Label htmlFor="push-notifications" className="text-sm font-medium cursor-pointer">
            Notifications push
          </Label>
        </div>

        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Switch
            id="push-notifications"
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={isLoading}
          />
        </div>
      </div>

      {showDescription && (
        <p className="text-xs text-muted-foreground">
          {isEnabled
            ? "Vous recevrez des notifications pour les rappels de cours, les nouveaux WODs, et les messages importants."
            : "Activez les notifications pour ne rien manquer."}
        </p>
      )}

      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default PushNotificationToggle;
