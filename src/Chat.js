import { useEffect, useState, useCallback } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { usePresence } from "./usePresence";
import { useOnlineStatus } from "./useOnlineStatus";

import UserList from "./UserList";
import PrivateChat from "./PrivateChat";
import GroupChat from "./GroupChat";
import AdminPanel from "./AdminPanel";

export default function Chat({ user, dark, toggleDark, onLogout }) {
  const [activeChat, setActiveChat] = useState(null); // { type: 'dm', user: {...} } or { type: 'group', id: '...' }
  const [showAdmin, setShowAdmin] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const isOnline = useOnlineStatus();

  /* ===================== REGISTER / UPDATE USER ===================== */
  usePresence(user);

  useEffect(() => {
    if (!user) return;

    setDoc(
      doc(db, "users", user.uid),
      {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photo: user.photoURL,
        online: true,
        lastSeen: serverTimestamp(),
        lastLogin: serverTimestamp(),
      },
      { merge: true }
    );

    // Set offline on unload
    const handleUnload = () => {
      setDoc(
        doc(db, "users", user.uid),
        { online: false, lastSeen: serverTimestamp() },
        { merge: true }
      );
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      handleUnload();
    };
  }, [user]);

  /* ===================== OPEN CHAT ===================== */
  const openDM = useCallback((otherUser) => {
    setActiveChat({ type: "dm", user: otherUser });
    setShowAdmin(false);
    // On mobile, hide sidebar
    if (window.innerWidth <= 768) setShowSidebar(false);
  }, []);

  const openGroup = useCallback((groupId) => {
    setActiveChat({ type: "group", id: groupId });
    setShowAdmin(false);
    if (window.innerWidth <= 768) setShowSidebar(false);
  }, []);

  const goBack = useCallback(() => {
    setActiveChat(null);
    setShowAdmin(false);
    setShowSidebar(true);
  }, []);

  const toggleAdmin = useCallback(() => {
    setShowAdmin((a) => !a);
    setActiveChat(null);
  }, []);

  /* ===================== RENDER ===================== */
  return (
    <div className="app-wrapper">
      {/* Connection Status */}
      {!isOnline && (
        <div className="connection-status offline">
          ⚠️ Tidak ada koneksi internet. Pesan akan dikirim saat online kembali.
        </div>
      )}

      <div className="app-container">
        {/* SIDEBAR */}
        <div className={`sidebar ${!showSidebar ? "hidden" : ""}`}>
          <UserList
            me={user}
            dark={dark}
            toggleDark={toggleDark}
            onLogout={onLogout}
            onSelectUser={openDM}
            onSelectGroup={openGroup}
            onToggleAdmin={toggleAdmin}
            activeChat={activeChat}
          />
        </div>

        {/* MAIN AREA */}
        <div className="chat-main">
          {showAdmin ? (
            <AdminPanel user={user} onBack={goBack} />
          ) : activeChat?.type === "dm" ? (
            <PrivateChat me={user} other={activeChat.user} onBack={goBack} />
          ) : activeChat?.type === "group" ? (
            <GroupChat user={user} groupId={activeChat.id} onBack={goBack} />
          ) : (
            <WelcomeScreen />
          )}
        </div>
      </div>
    </div>
  );
}

/* ===================== WELCOME SCREEN ===================== */
function WelcomeScreen() {
  return (
    <div className="welcome-screen">
      <div className="welcome-icon">💬</div>
      <div className="welcome-title">ChatPro Web</div>
      <div className="welcome-subtitle">
        Kirim dan terima pesan secara real-time. Pilih kontak dari sidebar untuk
        memulai percakapan, atau buat grup baru untuk chat bersama.
      </div>
      <div className="welcome-features">
        <div className="welcome-feature">
          <span className="welcome-feature-icon">🔒</span>
          <span>Pesan terenkripsi</span>
        </div>
        <div className="welcome-feature">
          <span className="welcome-feature-icon">📷</span>
          <span>Kirim foto & video</span>
        </div>
        <div className="welcome-feature">
          <span className="welcome-feature-icon">🎤</span>
          <span>Voice message</span>
        </div>
        <div className="welcome-feature">
          <span className="welcome-feature-icon">👥</span>
          <span>Group chat</span>
        </div>
      </div>
    </div>
  );
}
