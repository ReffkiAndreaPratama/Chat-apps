import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { app, db, auth } from "./firebase";

let messaging = null;

/**
 * Lazy-init messaging — hanya jika browser support.
 * Ini mencegah crash di localhost atau browser tanpa service worker.
 */
async function getMessagingInstance() {
  if (messaging) return messaging;

  const supported = await isSupported();
  if (!supported) {
    console.log("Firebase Messaging not supported in this browser");
    return null;
  }

  messaging = getMessaging(app);
  return messaging;
}

/* ================= INIT FCM ================= */
export const initMessaging = async () => {
  try {
    const msg = await getMessagingInstance();
    if (!msg) return;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission denied");
      return;
    }

    const token = await getToken(msg, {
      vapidKey: "PASTE_PUBLIC_VAPID_KEY_DI_SINI"
    });

    if (!token) {
      console.log("No FCM token");
      return;
    }

    console.log("FCM TOKEN:", token);

    const user = auth.currentUser;
    if (!user) return;

    await setDoc(
      doc(db, "fcmTokens", user.uid),
      {
        token,
        updatedAt: serverTimestamp(),
        platform: "web"
      },
      { merge: true }
    );
  } catch (err) {
    console.error("FCM error:", err);
  }
};

/* ================= FOREGROUND MESSAGE ================= */
export const setupForegroundMessages = async () => {
  try {
    const msg = await getMessagingInstance();
    if (!msg) return;

    onMessage(msg, (payload) => {
      console.log("Foreground message:", payload);

      if (Notification.permission === "granted") {
        new Notification(payload.notification?.title || "Pesan baru", {
          body: payload.notification?.body || "",
          icon: payload.notification?.icon || "/logo192.png"
        });
      }
    });
  } catch (err) {
    console.error("Foreground message setup error:", err);
  }
};

export { messaging };
