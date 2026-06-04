import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import { logAdminAction } from "./adminLog";

export default function AdminPanel({ user, onBack }) {
  const [appeals, setAppeals] = useState([]);
  const [reports, setReports] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState("appeals");

  /* ===== CHECK ADMIN ===== */
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      setIsAdmin(snap.exists() && snap.data().role === "admin");
    });
  }, [user]);

  /* ===== LOAD APPEALS ===== */
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(collection(db, "appeals"), (snap) => {
      setAppeals(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [isAdmin]);

  /* ===== LOAD REPORTS ===== */
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(collection(db, "reports"), (snap) => {
      setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [isAdmin]);

  /* ===== LOAD LOGS ===== */
  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, "adminLogs"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [isAdmin]);

  /* ===== APPROVE APPEAL ===== */
  const approveAppeal = async (uid) => {
    await updateDoc(doc(db, "appeals", uid), {
      status: "approved",
      reviewedBy: user.uid,
      reviewedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "reports", uid), {
      suspended: false,
      count: 0,
    });
    await logAdminAction({
      adminId: user.uid,
      action: "UNSUSPEND_USER",
      targetUser: uid,
    });
  };

  /* ===== REJECT APPEAL ===== */
  const rejectAppeal = async (uid) => {
    await updateDoc(doc(db, "appeals", uid), {
      status: "rejected",
      reviewedBy: user.uid,
      reviewedAt: serverTimestamp(),
    });
    await logAdminAction({
      adminId: user.uid,
      action: "REJECT_APPEAL",
      targetUser: uid,
    });
  };

  if (!isAdmin) {
    return (
      <>
        <div className="chat-header">
          <button className="back-btn" onClick={onBack}>←</button>
          <div className="chat-header-info">
            <div className="chat-header-name">Admin Panel</div>
          </div>
        </div>
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⛔</div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>Akses Ditolak</div>
          <div style={{ fontSize: 14, marginTop: 8 }}>Hanya admin yang bisa mengakses panel ini.</div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="chat-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <div className="chat-header-info">
          <div className="chat-header-name">⚙️ Admin Panel</div>
          <div className="chat-header-status">Kelola pengguna & laporan</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sidebar-tabs" style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border-light)" }}>
        <button className={`sidebar-tab ${tab === "appeals" ? "active" : ""}`} onClick={() => setTab("appeals")}>
          Banding ({appeals.filter((a) => a.status === "pending").length})
        </button>
        <button className={`sidebar-tab ${tab === "reports" ? "active" : ""}`} onClick={() => setTab("reports")}>
          Laporan ({reports.length})
        </button>
        <button className={`sidebar-tab ${tab === "logs" ? "active" : ""}`} onClick={() => setTab("logs")}>
          Log ({logs.length})
        </button>
      </div>

      {/* Content */}
      <div className="admin-panel">
        {/* Appeals Tab */}
        {tab === "appeals" && (
          <div className="admin-section">
            <h3>📋 Banding Pengguna</h3>
            {appeals.filter((a) => a.status === "pending").length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)" }}>
                Tidak ada banding yang menunggu review 🎉
              </div>
            )}
            {appeals
              .filter((a) => a.status === "pending")
              .map((a) => (
                <div key={a.uid} className="admin-item">
                  <div className="admin-item-info">
                    <div className="admin-item-title">{a.uid.slice(0, 16)}...</div>
                    <div className="admin-item-subtitle">"{a.reason}"</div>
                  </div>
                  <div className="admin-item-actions">
                    <button className="btn btn-primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => approveAppeal(a.uid)}>
                      ✓ Terima
                    </button>
                    <button className="btn btn-danger" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => rejectAppeal(a.uid)}>
                      ✕ Tolak
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Reports Tab */}
        {tab === "reports" && (
          <div className="admin-section">
            <h3>🚨 Pengguna Dilaporkan</h3>
            {reports.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)" }}>
                Tidak ada laporan 🎉
              </div>
            )}
            {reports.map((r) => (
              <div key={r.id} className="admin-item">
                <div className="admin-item-info">
                  <div className="admin-item-title">{r.id.slice(0, 16)}...</div>
                  <div className="admin-item-subtitle">
                    Laporan: {r.count} — {r.suspended ? "❌ Disuspend" : "✅ Aktif"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Logs Tab */}
        {tab === "logs" && (
          <div className="admin-section">
            <h3>📜 Audit Log</h3>
            {logs.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)" }}>
                Belum ada aktivitas admin
              </div>
            )}
            {logs.slice(0, 50).map((l) => (
              <div key={l.id} className="admin-item">
                <div className="admin-item-info">
                  <div className="admin-item-title">{l.action}</div>
                  <div className="admin-item-subtitle">
                    oleh {l.adminId?.slice(0, 8)}... → {l.targetUser?.slice(0, 8) || "-"}
                    {l.createdAt?.toDate && ` • ${l.createdAt.toDate().toLocaleString()}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
