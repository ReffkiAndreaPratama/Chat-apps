import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export const REPORT_THRESHOLD = 3;

export async function autoSuspendCheck(reports, adminUid) {
  const counter = {};
  reports.forEach((r) => {
    if (r.id) {
      counter[r.id] = (counter[r.id] || 0) + (r.count || 0);
    }
  });

  for (const [uid, count] of Object.entries(counter)) {
    if (count >= REPORT_THRESHOLD) {
      await updateDoc(doc(db, "users", uid), { banned: true });
      await addDoc(collection(db, "adminLogs"), {
        action: "AUTO_SUSPEND",
        adminId: "system",
        targetUser: uid,
        createdAt: serverTimestamp(),
      });
    }
  }
}

export function exportCSV(filename, rows) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
