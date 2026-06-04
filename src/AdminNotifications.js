import { useEffect, useState } from "react";
import { collection, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "./firebase";

export default function AdminNotifications() {
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    return onSnapshot(
      collection(db, "adminNotifications"),
      snap =>
        setNotifs(
          snap.docs.map(d => ({ id: d.id, ...d.data() }))
        )
    );
  }, []);

  const markRead = async id => {
    await updateDoc(doc(db, "adminNotifications", id), {
      read: true
    });
  };

  return (
    <div>
      <h3>🔔 Notifications</h3>
      {notifs.map(n => (
        <div key={n.id}>
          {!n.read && "🟢"} {n.message}
          <button onClick={() => markRead(n.id)}>✔</button>
        </div>
      ))}
    </div>
  );
}
