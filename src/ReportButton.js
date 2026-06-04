import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export default function ReportButton({ messageId, groupId, user }) {
  const report = async () => {
    await addDoc(collection(db, "reports"), {
      messageId,
      groupId,
      reporter: user.uid,
      reason: "Inappropriate content",
      createdAt: serverTimestamp()
    });
  };

  return <button onClick={report}>🚨 Report</button>;
}
