import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

export default function OnlineUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    return onSnapshot(collection(db, "users"), (snap) => {
      setUsers(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data()
        }))
      );
    });
  }, []);

  return (
    <div className="online-box">
      <h4>🟢 Online</h4>
      {users.map((u) => (
        <div key={u.id} className={u.online ? "online" : "offline"}>
          {u.name}
        </div>
      ))}
    </div>
  );
}
