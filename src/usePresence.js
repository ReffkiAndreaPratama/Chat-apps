import { useEffect } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Hook untuk mengelola online presence user secara real-time.
 * Mendeteksi tab focus/blur, visibility change, dan beforeunload.
 */
export function usePresence(user) {
  useEffect(() => {
    if (!user?.uid) return;

    const userRef = doc(db, "users", user.uid);

    const setOnline = () => {
      setDoc(userRef, { online: true, lastSeen: serverTimestamp() }, { merge: true });
    };

    const setOffline = () => {
      setDoc(userRef, { online: false, lastSeen: serverTimestamp() }, { merge: true });
    };

    // Set online immediately
    setOnline();

    // Visibility change (tab switch)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setOnline();
      } else {
        setOffline();
      }
    };

    // Window focus/blur
    const handleFocus = () => setOnline();
    const handleBlur = () => setOffline();

    // Before unload
    const handleUnload = () => setOffline();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("beforeunload", handleUnload);

    // Heartbeat - update lastSeen every 60s while online
    const heartbeat = setInterval(() => {
      if (document.visibilityState === "visible") {
        setDoc(userRef, { lastSeen: serverTimestamp() }, { merge: true });
      }
    }, 60000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("beforeunload", handleUnload);
      clearInterval(heartbeat);
      setOffline();
    };
  }, [user?.uid]);
}
