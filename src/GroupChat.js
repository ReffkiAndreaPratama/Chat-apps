import { useEffect, useState, useMemo, useRef } from "react";
import {
  doc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  deleteField,
} from "firebase/firestore";
import { db } from "./firebase";
import { uploadToCloudinary } from "./cloudinary";
import { logAdminAction } from "./adminLog";

const EMOJI_LIST = [
  "😀","😂","😍","🥰","😎","🤩","😭","🥺","😡","🤔",
  "👍","👎","❤️","🔥","💯","🎉","👏","🙏","💪","✨",
];

export default function GroupChat({ user, groupId, onBack }) {
  const myUid = user?.uid || "";

  const groupRef = useMemo(() => {
    if (!groupId) return null;
    return doc(db, "groups", groupId);
  }, [groupId]);

  /* ===== STATE ===== */
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [imageViewer, setImageViewer] = useState(null);

  const fileRef = useRef(null);
  const recorderRef = useRef(null);
  const timerRef = useRef(null);
  const chatBoxRef = useRef(null);

  /* ===== WATCH GROUP ===== */
  useEffect(() => {
    if (!groupRef) return;
    const unsub = onSnapshot(groupRef, (snap) => {
      setGroup(snap.data());
    });
    return () => unsub();
  }, [groupRef]);

  /* ===== LOAD MESSAGES ===== */
  useEffect(() => {
    if (!groupId) return;
    const q = query(
      collection(db, "groups", groupId, "messages"),
      orderBy("createdAt")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [groupId]);

  /* ===== AUTO SCROLL ===== */
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  /* ===== FILE PREVIEW ===== */
  useEffect(() => {
    const urls = files.map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    setPreviews(urls);
    return () => urls.forEach((p) => URL.revokeObjectURL(p.url));
  }, [files]);

  /* ===== ROLE ===== */
  const myRole = group?.members?.[myUid] || null;
  const isAdmin = myRole === "admin";
  const isModerator = isAdmin || myRole === "moderator";
  const isMember = !!myRole;

  /* ===== JOIN REQUEST ===== */
  const requestJoin = async () => {
    if (!groupRef || !myUid || isMember) return;
    if (group?.joinRequests?.[myUid]) return;
    await updateDoc(groupRef, { [`joinRequests.${myUid}`]: true });
  };

  const approveJoin = async (targetUid) => {
    if (!isAdmin || !groupRef) return;
    await updateDoc(groupRef, {
      [`members.${targetUid}`]: "member",
      [`joinRequests.${targetUid}`]: deleteField(),
    });
    await logAdminAction({ adminId: myUid, action: "APPROVE_JOIN", targetUser: targetUid, groupId });
  };

  const rejectJoin = async (targetUid) => {
    if (!isAdmin || !groupRef) return;
    await updateDoc(groupRef, { [`joinRequests.${targetUid}`]: deleteField() });
    await logAdminAction({ adminId: myUid, action: "REJECT_JOIN", targetUser: targetUid, groupId });
  };

  /* ===== SEND ===== */
  const send = async () => {
    if (!isMember) return;
    if (!text.trim() && files.length === 0 && !audioBlob) return;

    const msgText = text.trim();
    setText("");
    setFiles([]);
    setAudioBlob(null);
    setShowEmoji(false);

    const uploaded = [];
    for (const f of files) {
      const url = await uploadToCloudinary(f);
      uploaded.push({
        url,
        type: f.type.startsWith("image") ? "image" : f.type.startsWith("video") ? "video" : "file",
        name: f.name,
      });
    }

    let audioUrl = null;
    if (audioBlob) {
      audioUrl = await uploadToCloudinary(new File([audioBlob], "voice.webm", { type: "audio/webm" }));
    }

    await addDoc(collection(db, "groups", groupId, "messages"), {
      text: msgText,
      from: myUid,
      fromName: user.displayName,
      fromPhoto: user.photoURL,
      files: uploaded,
      audio: audioUrl,
      createdAt: serverTimestamp(),
    });
  };

  /* ===== DELETE MESSAGE ===== */
  const deleteMessage = async (m) => {
    if (!isModerator) return;
    await updateDoc(doc(db, "groups", groupId, "messages", m.id), {
      text: "🚫 Pesan dihapus oleh admin",
      files: [],
      audio: null,
      deleted: true,
    });
    await logAdminAction({ adminId: myUid, action: "DELETE_MESSAGE", targetUser: m.from, groupId });
  };

  /* ===== VOICE ===== */
  const toggleRecord = async () => {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      clearInterval(timerRef.current);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        setAudioBlob(new Blob(chunks, { type: "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setRecording(true);
      setRecordTime(0);
      timerRef.current = setInterval(() => setRecordTime((t) => t + 1), 1000);
    } catch (err) {
      console.error("Mic error:", err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  /* ===== NOT MEMBER ===== */
  if (!isMember) {
    return (
      <>
        <div className="chat-header">
          <button className="back-btn" onClick={onBack}>←</button>
          <div
            style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "linear-gradient(135deg, #00a884, #0088cc)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, color: "white",
            }}
          >
            👥
          </div>
          <div className="chat-header-info">
            <div className="chat-header-name">Public Group</div>
            <div className="chat-header-status">Grup publik</div>
          </div>
        </div>

        <div className="group-join-panel">
          <div className="group-join-icon">👥</div>
          <div className="group-join-title">Bergabung ke Grup</div>
          <div className="group-join-text">
            {group?.joinRequests?.[myUid]
              ? "Permintaan bergabung sudah dikirim. Menunggu persetujuan admin."
              : "Klik tombol di bawah untuk mengajukan permintaan bergabung ke grup ini."}
          </div>
          {!group?.joinRequests?.[myUid] && (
            <button className="btn btn-primary" onClick={requestJoin}>
              Minta Bergabung
            </button>
          )}
          {group?.joinRequests?.[myUid] && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--warning)" }}>
              ⏳ Menunggu persetujuan...
            </div>
          )}
        </div>
      </>
    );
  }

  /* ===== RENDER ===== */
  return (
    <>
      {/* HEADER */}
      <div className="chat-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <div
          style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "linear-gradient(135deg, #00a884, #0088cc)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, color: "white",
          }}
        >
          👥
        </div>
        <div className="chat-header-info">
          <div className="chat-header-name">
            Public Group {isAdmin && "👑"}
          </div>
          <div className="chat-header-status">
            {group?.members ? Object.keys(group.members).length : 0} anggota
          </div>
        </div>
        <div className="chat-header-actions">
          <button className="icon-btn" title="Cari">🔍</button>
        </div>
      </div>

      {/* JOIN REQUESTS (Admin only) */}
      {isAdmin && group?.joinRequests && Object.keys(group.joinRequests).length > 0 && (
        <div className="join-requests-panel">
          <div className="join-requests-title">
            📋 Permintaan Bergabung ({Object.keys(group.joinRequests).length})
          </div>
          {Object.keys(group.joinRequests).map((uid) => (
            <div key={uid} className="join-request-item">
              <span className="name">{uid.slice(0, 12)}...</span>
              <button className="btn btn-primary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => approveJoin(uid)}>
                ✓ Terima
              </button>
              <button className="btn btn-danger" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => rejectJoin(uid)}>
                ✕ Tolak
              </button>
            </div>
          ))}
        </div>
      )}

      {/* MESSAGES */}
      <div className="chat-messages" ref={chatBoxRef}>
        <div className="chat-messages-inner">
          {messages.map((m, i) => {
            const isMine = m.from === myUid;
            const showDate = i === 0 || !isSameDay(
              messages[i - 1]?.createdAt?.toDate?.(),
              m.createdAt?.toDate?.()
            );

            return (
              <div key={m.id}>
                {showDate && m.createdAt?.toDate && (
                  <div className="date-separator">
                    <span>{formatDate(m.createdAt.toDate())}</span>
                  </div>
                )}

                <div className={`message-row ${isMine ? "sent" : "received"}`}>
                  <div className="message-bubble">
                    {/* Sender name for group */}
                    {!isMine && (
                      <div className="message-sender">{m.fromName || "User"}</div>
                    )}

                    {/* Media */}
                    {m.files?.map((f, fi) => (
                      <div key={fi} className="message-media">
                        {f.type === "image" && (
                          <img src={f.url} alt="" onClick={() => setImageViewer(f.url)} />
                        )}
                        {f.type === "video" && <video src={f.url} controls />}
                        {f.type === "file" && (
                          <a href={f.url} target="_blank" rel="noreferrer" className="message-file">
                            <div className="message-file-icon">📄</div>
                            <div className="message-file-info">
                              <div className="message-file-name">{f.name || "File"}</div>
                            </div>
                          </a>
                        )}
                      </div>
                    ))}

                    {m.audio && (
                      <div className="message-audio">
                        <audio controls src={m.audio} />
                      </div>
                    )}

                    {m.text && <div className="message-text">{m.text}</div>}

                    <div className="message-footer">
                      <span className="message-time">
                        {m.createdAt?.toDate?.()?.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        }) || ""}
                      </span>
                    </div>

                    {/* Moderator delete */}
                    {isModerator && !m.deleted && (
                      <div className="message-actions-trigger">
                        <button onClick={() => deleteMessage(m)}>🗑️</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* IMAGE VIEWER */}
      {imageViewer && (
        <div className="image-viewer" onClick={() => setImageViewer(null)}>
          <img src={imageViewer} alt="" />
          <button className="image-viewer-close" onClick={() => setImageViewer(null)}>✕</button>
        </div>
      )}

      {/* INPUT */}
      <div className="chat-input-area">
        {previews.length > 0 && (
          <div className="file-preview-bar">
            {previews.map((p, i) => (
              <div key={i} className="file-preview-item">
                {p.file.type.startsWith("image") ? (
                  <img src={p.url} alt="" />
                ) : (
                  <div className="file-icon">📄</div>
                )}
                <button className="remove-file" onClick={() => setFiles(files.filter((_, fi) => fi !== i))}>✕</button>
              </div>
            ))}
          </div>
        )}

        {recording ? (
          <div className="recording-bar">
            <div className="recording-indicator" />
            <span className="recording-time">
              {Math.floor(recordTime / 60)}:{String(recordTime % 60).padStart(2, "0")}
            </span>
            <div style={{ flex: 1, textAlign: "center" }}>
              <span className="recording-cancel">Merekam...</span>
            </div>
            <button className="btn btn-danger" style={{ padding: "6px 12px", fontSize: 13 }} onClick={toggleRecord}>
              ⏹ Stop
            </button>
          </div>
        ) : (
          <div className="input-bar">
            <div className="input-left-actions">
              <button className="icon-btn" onClick={() => setShowEmoji(!showEmoji)}>😊</button>
              <button className="icon-btn" onClick={() => fileRef.current?.click()}>📎</button>
              <input ref={fileRef} type="file" multiple hidden onChange={(e) => setFiles([...files, ...Array.from(e.target.files)])} />
            </div>

            <div className="input-container">
              {showEmoji && (
                <div className="emoji-picker-container">
                  <div className="emoji-picker">
                    <div className="emoji-grid">
                      {EMOJI_LIST.map((e) => (
                        <button key={e} className="emoji-item" onClick={() => setText((t) => t + e)}>
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <textarea
                className="input-field"
                placeholder="Ketik pesan ke grup..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
            </div>

            <div className="input-right-actions">
              {text.trim() || files.length > 0 || audioBlob ? (
                <button className="send-btn" onClick={send}>➤</button>
              ) : (
                <button className="record-btn" onClick={toggleRecord}>🎤</button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ===== HELPERS ===== */
function formatDate(date) {
  if (!date) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Hari ini";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Kemarin";
  return date.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function isSameDay(d1, d2) {
  if (!d1 || !d2) return false;
  return d1.toDateString() === d2.toDateString();
}
