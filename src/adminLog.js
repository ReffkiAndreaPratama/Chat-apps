import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export const logAdminAction = async ({
  adminId,
  action,
  targetUser = null,
  groupId = null
}) => {
  await addDoc(collection(db, "adminLogs"), {
    adminId,
    action,
    targetUser,
    groupId,
    createdAt: serverTimestamp()
  });
};
