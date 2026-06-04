import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "./firebase";
import { logAdminAction } from "./adminLog";

export default function AdminAppeals({ admin }) {
  const [appeals, setAppeals] = useState([]);

  useEffect(() => {
    return onSnapshot(collection(db, "appeals"), snap => {
      setAppeals(
        snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        }))
      );
    });
  }, []);

  const approve = async uid => {
    await updateDoc(doc(db, "appeals", uid), {
      status: "approved",
      reviewedBy: admin.uid,
      reviewedAt: serverTimestamp()
    });

    await updateDoc(doc(db, "reports", uid), {
      suspended: false,
      count: 0
    });

    await logAdminAction({
      adminId: admin.uid,
      action: "UNSUSPEND_USER",
      targetUser: uid
    });
  };

  const reject = async uid => {
    await updateDoc(doc(db, "appeals", uid), {
      status: "rejected",
      reviewedBy: admin.uid,
      reviewedAt: serverTimestamp()
    });

    await logAdminAction({
      adminId: admin.uid,
      action: "REJECT_APPEAL",
      targetUser: uid
    });
  };

  return (
    <div style={{ padding: 20 }}>
      <h3>🧾 Appeal Queue</h3>

      {appeals.map(a => (
        <div key={a.id} style={{ borderBottom: "1px solid #ccc" }}>
          <b>User:</b> {a.id}
          <p>{a.reason}</p>
          <small>Status: {a.status}</small>

          {a.status === "pending" && (
            <div>
              <button onClick={() => approve(a.id)}>Approve</button>
              <button onClick={() => reject(a.id)}>Reject</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
