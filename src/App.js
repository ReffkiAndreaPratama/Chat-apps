import { useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

import Login from "./Login";
import Chat from "./Chat";
import AppealForm from "./AppealForm";
import { useSuspendWatcher } from "./useSuspendWatcher";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(() => {
    return localStorage.getItem("chatpro-theme") === "dark";
  });
  const [suspended, setSuspended] = useState(false);

  /* ================= THEME ================= */
  useEffect(() => {
    localStorage.setItem("chatpro-theme", dark ? "dark" : "light");
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  /* ================= AUTO LOGIN ================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (authUser) => {
      if (!authUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const snap = await getDoc(doc(db, "users", authUser.uid));
      if (snap.exists()) {
        setUser({ ...authUser, ...snap.data() });
      } else {
        setUser(authUser);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  /* ================= REALTIME SUSPEND WATCHER ================= */
  useSuspendWatcher(user);

  /* ================= WATCH SUSPEND STATUS ================= */
  useEffect(() => {
    if (!user?.uid) return;

    const ref = doc(db, "reports", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      setSuspended(!!snap.data()?.suspended);
    });

    return () => unsub();
  }, [user?.uid]);

  const toggleDark = useCallback(() => setDark((d) => !d), []);

  const handleLogout = useCallback(() => {
    signOut(auth);
  }, []);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <div className="loading-text">Memuat ChatPro...</div>
      </div>
    );
  }

  /* ================= NOT LOGIN ================= */
  if (!user) {
    return <Login />;
  }

  /* ================= SUSPENDED USER ================= */
  if (suspended) {
    return (
      <div className={`suspended-screen ${dark ? "dark" : ""}`}>
        <div className="suspended-icon">🚫</div>
        <div className="suspended-title">Akun Disuspend</div>
        <div className="suspended-text">
          Akun kamu telah disuspend karena melanggar ketentuan komunitas.
          Kamu bisa mengajukan banding di bawah ini.
        </div>
        <button className="btn btn-primary" onClick={handleLogout}>
          Logout
        </button>
        <div style={{ marginTop: 32, width: "100%", maxWidth: 480 }}>
          <AppealForm user={user} />
        </div>
      </div>
    );
  }

  /* ================= NORMAL APP ================= */
  return (
    <div className={dark ? "dark" : ""}>
      <Chat user={user} dark={dark} toggleDark={toggleDark} onLogout={handleLogout} />
    </div>
  );
}
