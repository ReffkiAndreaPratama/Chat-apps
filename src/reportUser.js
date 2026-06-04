import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export const reportUser = async (targetUid) => {
  const ref = doc(db, "reports", targetUid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      count: 1,
      suspended: false,
      updatedAt: serverTimestamp()
    });
    return;
  }

  const data = snap.data();
  const newCount = data.count + 1;

  await updateDoc(ref, {
    count: newCount,
    suspended: newCount >= 3,
    updatedAt: serverTimestamp()
  });
};
