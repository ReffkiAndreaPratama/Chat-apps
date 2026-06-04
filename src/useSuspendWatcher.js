import { useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "./firebase";

export const useSuspendWatcher = (user) => {
  useEffect(() => {
    if (!user) return;

    const ref = doc(db, "reports", user.uid);

    const unsub = onSnapshot(ref, snap => {
      if (!snap.exists()) return;

      const data = snap.data();
      if (data.suspended === true) {
        alert("Akun kamu disuspend");
        signOut(auth);
      }
    });

    return () => unsub();
  }, [user]);
};
