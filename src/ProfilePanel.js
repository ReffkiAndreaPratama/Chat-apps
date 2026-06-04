import { useState } from "react";

/**
 * Panel profil user yang muncul di sisi kanan saat klik avatar.
 * Menampilkan info user, media bersama, dan opsi.
 */
export default function ProfilePanel({ user, onClose, onReport }) {
  const [tab, setTab] = useState("media"); // media | files | links

  return (
    <div className="profile-panel">
      {/* Header */}
      <div className="profile-panel-header">
        <button className="icon-btn" onClick={onClose}>✕</button>
        <h3>Info Kontak</h3>
      </div>

      {/* Body */}
      <div className="profile-panel-body">
        <img
          src={user?.photo || "/logo192.png"}
          alt={user?.name}
          className="profile-panel-avatar"
        />
        <div className="profile-panel-name">{user?.name || "User"}</div>
        <div className="profile-panel-status">
          {user?.online ? "🟢 Online" : "Offline"}
        </div>

        {/* About */}
        <div className="profile-section">
          <div className="profile-section-title">Tentang</div>
          <div className="profile-section-content">
            {user?.about || "Hey there! I'm using ChatPro"}
          </div>
        </div>

        {/* Email */}
        <div className="profile-section">
          <div className="profile-section-title">Email</div>
          <div className="profile-section-content">
            {user?.email || "-"}
          </div>
        </div>

        {/* Role */}
        {user?.role === "admin" && (
          <div className="profile-section">
            <div className="profile-section-title">Role</div>
            <div className="profile-section-content">
              👑 Administrator
            </div>
          </div>
        )}

        {/* Media Tabs */}
        <div className="profile-section">
          <div className="profile-section-title">Media & File</div>
          <div className="sidebar-tabs" style={{ margin: "8px -24px 0", borderTop: "1px solid var(--border-light)" }}>
            <button
              className={`sidebar-tab ${tab === "media" ? "active" : ""}`}
              onClick={() => setTab("media")}
            >
              📷 Media
            </button>
            <button
              className={`sidebar-tab ${tab === "files" ? "active" : ""}`}
              onClick={() => setTab("files")}
            >
              📄 File
            </button>
            <button
              className={`sidebar-tab ${tab === "links" ? "active" : ""}`}
              onClick={() => setTab("links")}
            >
              🔗 Link
            </button>
          </div>
          <div style={{ padding: "16px 0", textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>
            Belum ada {tab === "media" ? "media" : tab === "files" ? "file" : "link"} bersama
          </div>
        </div>

        {/* Actions */}
        <div className="profile-section" style={{ borderTop: "none" }}>
          <button
            className="btn btn-danger"
            style={{ width: "100%" }}
            onClick={() => onReport?.(user?.uid)}
          >
            🚨 Laporkan Pengguna
          </button>
        </div>
      </div>
    </div>
  );
}
