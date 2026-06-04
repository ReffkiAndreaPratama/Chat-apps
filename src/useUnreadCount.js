import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Hook untuk menghitung jumlah pesan yang belum dibaca.
 * Mendengarkan semua private chat yang melibatkan user ini.
 */
export function useUnreadCount(myUid) {
  const [unreadMap, setUnreadMap] = useState({}); // { chatId: count }

  useEffect(() => {
    if (!myUid) return;

    // Listen to all private chats involving this user
    // Note: Firestore doesn't support complex queries easily,
    // so we track unread in a simpler way via the chat metadata
    const q = query(collection(db, "privateChats"));

    const unsub = onSnapshot(q, (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.users?.includes(myUid)) {
          // Count unread from lastRead metadata
          map[d.id] = data.unread?.[myUid] || 0;
        }
      });
      setUnreadMap(map);
    });

    return () => unsub();
  }, [myUid]);

  const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0);

  return { unreadMap, totalUnread };
}
