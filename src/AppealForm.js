import { useState } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export default function AppealForm({ user }) {
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!reason.trim()) return;
    setLoading(true);

    try {
      await setDoc(doc(db, "appeals", user.uid), {
        reason,
        status: "pending",
        createdAt: serverTimestamp(),
        reviewedBy: null,
        reviewedAt: null,
      });
      setSent(true);
    } catch (err) {
      console.error("Appeal error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div style={{
        padding: 32,
        textAlign: "center",
        background: "var(--bg-card)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-sm)",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          Banding Terkirim
        </div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Tim admin akan meninjau banding kamu. Harap tunggu.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: 24,
      background: "var(--bg-card)",
      borderRadius: "var(--radius-md)",
      boxShadow: "var(--shadow-sm)",
    }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        📝 Ajukan Banding
      </h3>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.6 }}>
        Jelaskan mengapa akun kamu seharusnya diaktifkan kembali. Berikan alasan yang jelas dan jujur.
      </p>
      <textarea
        placeholder="Tulis alasan banding kamu di sini..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={4}
        style={{
          width: "100%",
          padding: 12,
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)",
          background: "var(--bg-input)",
          fontSize: 14,
          resize: "vertical",
          fontFamily: "inherit",
          color: "var(--text-primary)",
        }}
      />
      <button
        className="btn btn-primary"
        onClick={submit}
        disabled={!reason.trim() || loading}
        style={{ marginTop: 16, width: "100%" }}
      >
        {loading ? "Mengirim..." : "Kirim Banding"}
      </button>
    </div>
  );
}
