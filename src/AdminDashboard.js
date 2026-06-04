import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

export default function AdminDashboard() {
  const [logs, setLogs] = useState([]);
  const [reports, setReports] = useState([]);

  /* ===== AUDIT LOG ===== */
  useEffect(() => {
    const q = query(
      collection(db, "adminLogs"),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(q, snap => {
      setLogs(
        snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        }))
      );
    });
  }, []);

  /* ===== REPORTS ===== */
  useEffect(() => {
    return onSnapshot(collection(db, "reports"), snap => {
      setReports(
        snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        }))
      );
    });
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>📊 Admin Dashboard</h2>

      <h3>🚨 Reported Users</h3>
      {reports.map(r => (
        <div key={r.id}>
          {r.id} — reports: {r.count} —{" "}
          {r.suspended ? "❌ Suspended" : "✅ Active"}
        </div>
      ))}

      <h3>🔍 Audit Log</h3>
      {logs.map(l => (
        <div key={l.id} style={{ borderBottom: "1px solid #333" }}>
          <b>{l.action}</b> by {l.adminId} <br />
          target: {l.targetUser || "-"} <br />
          group: {l.groupId || "-"}
        </div>
      ))}
    </div>
  );
}
