"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isPushSupported,
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
  canUsePushNotifications,
  isPwaInstalled,
  isIOS,
  type PushSubscriptionData,
} from "@/lib/push-notifications";

export interface UsePushNotificationsReturn {
  // État
  isSupported: boolean;
  isEnabled: boolean;
  permission: NotificationPermission | "unsupported";
  subscription: PushSubscription | null;
  isPwa: boolean;
  isIosDevice: boolean;
  canUsePush: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  requestPermission: () => Promise<NotificationPermission>;
  subscribe: () => Promise<PushSubscriptionData | null>;
  unsubscribe: () => Promise<boolean>;
}

/**
 * Hook pour gérer les push notifications
 *
 * @example
 * ```tsx
 * const {
 *   isSupported,
 *   isEnabled,
 *   permission,
 *   subscribe,
 *   unsubscribe,
 * } = usePushNotifications();
 *
 * if (!isSupported) {
 *   return <p>Push notifications non supportées</p>;
 * }
 *
 * return (
 *   <button onClick={isEnabled ? unsubscribe : subscribe}>
 *     {isEnabled ? "Désactiver" : "Activer"} les notifications
 *   </button>
 * );
 * ```
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isPwa, setIsPwa] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const [canUsePush, setCanUsePush] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialisation
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Vérifier le support
        const pushSupported = isPushSupported();
        const notifSupported = isNotificationSupported();
        setIsSupported(pushSupported && notifSupported);

        // Vérifier la permission
        const perm = getNotificationPermission();
        setPermission(perm);

        // Vérifier l'environnement
        setIsPwa(isPwaInstalled());
        setIsIosDevice(isIOS());
        setCanUsePush(canUsePushNotifications());

        // Récupérer l'abonnement existant
        if (pushSupported) {
          const existingSubscription = await getCurrentSubscription();
          setSubscription(existingSubscription);
        }
      } catch (err) {
        console.error("[usePushNotifications] Erreur d'initialisation:", err);
        setError("Erreur lors de l'initialisation des notifications");
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Demander la permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    setError(null);

    try {
      const perm = await requestNotificationPermission();
      setPermission(perm);
      return perm;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de la demande de permission";
      setError(message);
      throw err;
    }
  }, []);

  // S'abonner
  const subscribe = useCallback(async (): Promise<PushSubscriptionData | null> => {
    setError(null);
    setIsLoading(true);

    try {
      // Récupérer la clé VAPID publique depuis les variables d'environnement
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        throw new Error("Clé VAPID non configurée. Ajoutez NEXT_PUBLIC_VAPID_PUBLIC_KEY dans .env");
      }

      const subscriptionData = await subscribeToPush(vapidPublicKey);

      if (subscriptionData) {
        // Mettre à jour l'état
        const newSubscription = await getCurrentSubscription();
        setSubscription(newSubscription);
        setPermission("granted");

        // TODO: Envoyer l'abonnement au serveur pour stocker
        // await saveSubscriptionToServer(subscriptionData);
      }

      return subscriptionData;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'abonnement";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Se désabonner
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      const success = await unsubscribeFromPush();

      if (success) {
        setSubscription(null);

        // TODO: Supprimer l'abonnement du serveur
        // await removeSubscriptionFromServer();
      }

      return success;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors du désabonnement";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // État
    isSupported,
    isEnabled: !!subscription && permission === "granted",
    permission,
    subscription,
    isPwa,
    isIosDevice,
    canUsePush,
    isLoading,
    error,

    // Actions
    requestPermission,
    subscribe,
    unsubscribe,
  };
}

export default usePushNotifications;
