/**
 * Service de gestion des Push Notifications
 *
 * Ce module gère:
 * - L'enregistrement du Service Worker
 * - La demande de permission pour les notifications
 * - L'abonnement aux push notifications
 * - L'envoi de notifications depuis le serveur (via Web Push API)
 *
 * Note: Les push notifications sur iOS sont limités en PWA.
 * Sur iOS, utiliser les notifications in-app ou email comme fallback.
 */

// Types
export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: NotificationAction[];
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

// État local
let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

/**
 * Vérifie si les push notifications sont supportées
 */
export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window;
}

/**
 * Vérifie si les notifications sont supportées
 */
export function isNotificationSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "Notification" in window;
}

/**
 * Récupère l'état actuel de la permission
 */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Enregistre le Service Worker et retourne la registration
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) {
    console.warn("[Push] Service Worker non supporté sur ce navigateur");
    return null;
  }

  try {
    // Attendre que le SW soit prêt
    serviceWorkerRegistration = await navigator.serviceWorker.ready;
    console.log("[Push] Service Worker enregistré:", serviceWorkerRegistration.scope);
    return serviceWorkerRegistration;
  } catch (error) {
    console.error("[Push] Erreur lors de l'enregistrement du SW:", error);
    return null;
  }
}

/**
 * Demande la permission pour les notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    throw new Error("Notifications non supportées sur ce navigateur");
  }

  // Si déjà accordé ou refusé, retourner l'état actuel
  if (Notification.permission !== "default") {
    return Notification.permission;
  }

  // Demander la permission
  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * S'abonne aux push notifications
 * Retourne les données d'abonnement à envoyer au serveur
 */
export async function subscribeToPush(
  vapidPublicKey: string
): Promise<PushSubscriptionData | null> {
  if (!isPushSupported()) {
    throw new Error("Push notifications non supportées");
  }

  // S'assurer que le SW est enregistré
  const registration = serviceWorkerRegistration || (await registerServiceWorker());
  if (!registration) {
    throw new Error("Impossible d'enregistrer le Service Worker");
  }

  // Vérifier la permission
  const permission = await requestNotificationPermission();
  if (permission !== "granted") {
    console.warn("[Push] Permission refusée par l'utilisateur");
    return null;
  }

  try {
    // Convertir la clé VAPID en ArrayBuffer
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer;

    // S'abonner
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    // Extraire les données nécessaires
    const subscriptionJson = subscription.toJSON();

    if (!subscriptionJson.endpoint || !subscriptionJson.keys) {
      throw new Error("Données d'abonnement invalides");
    }

    const subscriptionData: PushSubscriptionData = {
      endpoint: subscriptionJson.endpoint,
      keys: {
        p256dh: subscriptionJson.keys.p256dh as string,
        auth: subscriptionJson.keys.auth as string,
      },
    };

    console.log("[Push] Abonné avec succès:", subscriptionData.endpoint);
    return subscriptionData;
  } catch (error) {
    console.error("[Push] Erreur lors de l'abonnement:", error);
    throw error;
  }
}

/**
 * Se désabonne des push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  const registration = serviceWorkerRegistration || (await registerServiceWorker());
  if (!registration) return false;

  try {
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const success = await subscription.unsubscribe();
      console.log("[Push] Désabonné:", success);
      return success;
    }
    return true;
  } catch (error) {
    console.error("[Push] Erreur lors du désabonnement:", error);
    return false;
  }
}

/**
 * Récupère l'abonnement actuel (si existant)
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  const registration = serviceWorkerRegistration || (await registerServiceWorker());
  if (!registration) return null;

  try {
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error("[Push] Erreur lors de la récupération de l'abonnement:", error);
    return null;
  }
}

/**
 * Affiche une notification locale (sans passer par le serveur)
 */
export function showLocalNotification(payload: NotificationPayload): void {
  if (!isNotificationSupported()) {
    console.warn("[Push] Notifications non supportées");
    return;
  }

  if (Notification.permission !== "granted") {
    console.warn("[Push] Permission non accordée");
    return;
  }

  const notification = new Notification(payload.title, {
    body: payload.body,
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: payload.badge || "/icons/icon-96x96.png",
    tag: payload.tag,
    data: payload.data,
  });

  // Gérer le clic sur la notification
  notification.onclick = () => {
    window.focus();
    if (payload.data?.url) {
      window.location.href = payload.data.url as string;
    }
    notification.close();
  };
}

/**
 * Utilitaire: Convertit une clé VAPID base64 en Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Détecte si l'app est installée en mode PWA
 */
export function isPwaInstalled(): boolean {
  if (typeof window === "undefined") return false;

  // Vérifier display-mode
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

  // iOS Safari
  const isIosStandalone =
    "standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone;

  return isStandalone || !!isIosStandalone;
}

/**
 * Détecte si on est sur iOS
 */
export function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Détecte si les push sont supportés sur l'appareil actuel
 * Note: iOS en PWA a un support limité
 */
export function canUsePushNotifications(): boolean {
  if (!isPushSupported()) return false;

  // Sur iOS, les push ne sont supportés qu'en PWA depuis iOS 16.4+
  if (isIOS()) {
    const iosVersion = parseIOSVersion();
    if (iosVersion && iosVersion < 16.4) {
      return false;
    }
    // Même sur iOS 16.4+, les push en PWA ont des limitations
    return isPwaInstalled();
  }

  return true;
}

/**
 * Parse la version iOS depuis le user agent
 */
function parseIOSVersion(): number | null {
  if (typeof window === "undefined") return null;

  const match = navigator.userAgent.match(/OS (\d+)_(\d+)/);
  if (match) {
    return parseFloat(`${match[1]}.${match[2]}`);
  }
  return null;
}
