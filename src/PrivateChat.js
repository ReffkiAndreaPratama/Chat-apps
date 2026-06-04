import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { uploadToCloudinary } from "./cloudinary";
import { useNotificationSound } from "./useNotificationSound";
import { useAutoResize } from "./useAutoResize";
import MessageText from "./MessageText";
import ProfilePanel from "./ProfilePanel";
import { reportUser } from "./reportUser";

const EMOJI_LIST = [
  "😀","😂","😍","🥰","😎","🤩","😭","🥺","😡","🤔",
  "👍","👎","❤️","🔥","💯","🎉","👏","🙏","💪","✨",
  "😊","🤣","😘","😋","🤗","😴","🙄","😤","🥳","😇",
  "🫡","🫶","💀","👀","🤝","✅","❌","⭐","🌟","💫",
];

const REACTIONS = ["❤️", "😂", "😮", "😢", "🙏", "👍"];

export default function PrivateChat({ me, other, onBack }) {
  const myUid = me?.uid || "";
  const otherUid = other?.uid || "";

  const chatId = useMemo(() => {
    if (!myUid || !otherUid) return null;
    return [myUid, otherUid].sort().join("_");
  }, [myUid, otherUid]);

  const chatRef = useMemo(
    () => (chatId ? doc(db, "privateChats", chatId) : null),
    [chatId]
  );

  /* ===== STATE ===== */
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);

  const [reply, setReply] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [imageViewer, setImageViewer] = useState(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const fileRef = useRef(null);
  const recorderRef = useRef(null);
  const timerRef = useRef(null);
  const chatBoxRef = useRef(null);
  const inputRef = useRef(null);
  const prevMsgCountRef = useRef(0);
  const playSound = useNotificationSound();
  useAutoResize(inputRef, text);

  /* ===== INIT CHAT ===== */
  useEffect(() => {
    if (!chatRef) return;

    setDoc(
      chatRef,
      {
        users: [myUid, otherUid],
        online: { [myUid]: true },
        lastSeen: { [myUid]: serverTimestamp() },
      },
      { merge: true }
    );

    return () => {
      setDoc(
        chatRef,
        {
          online: { [myUid]: false },
          lastSeen: { [myUid]: serverTimestamp() },
        },
        { merge: true }
      );
    };
  }, [chatRef, myUid, otherUid]);

  /* ===== WATCH META ===== */
  useEffect(() => {
    if (!chatRef) return;

    return onSnapshot(chatRef, (snap) => {
      const d = snap.data();
      setOnline(d?.online?.[otherUid]);
      setLastSeen(d?.lastSeen?.[otherUid]?.toDate());
      setTyping(d?.typing?.[otherUid]);
    });
  }, [chatRef, otherUid]);

  /* ===== LOAD MESSAGES ===== */
  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, "privateChats", chatId, "messages"),
      orderBy("createdAt")
    );

    return onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      
      // Play sound for new incoming messages
      if (data.length > prevMsgCountRef.current && prevMsgCountRef.current > 0) {
        const lastMsg = data[data.length - 1];
        if (lastMsg?.from !== myUid) {
          playSound();
        }
      }
      prevMsgCountRef.current = data.length;
      
      setMessages(data);

      // Mark as read
      data.forEach((m) => {
        if (m.from !== myUid && !m.readBy?.[myUid]) {
          updateDoc(doc(db, "privateChats", chatId, "messages", m.id), {
            [`readBy.${myUid}`]: true,
          });
        }
      });
    });
  }, [chatId, myUid, playSound]);

  /* ===== AUTO SCROLL ===== */
  useEffect(() => {
    if (chatBoxRef.current) {
      const el = chatBoxRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [messages]);

  /* ===== SCROLL DETECTION ===== */
  const handleScroll = useCallback(() => {
    if (!chatBoxRef.current) return;
    const el = chatBoxRef.current;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    setShowScrollBtn(!isNearBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, []);

  /* ===== TYPING ===== */
  useEffect(() => {
    if (!text || !chatRef) return;

    updateDoc(chatRef, { [`typing.${myUid}`]: true });
    const t = setTimeout(() => {
      updateDoc(chatRef, { [`typing.${myUid}`]: false });
    }, 1500);

    return () => clearTimeout(t);
  }, [text, chatRef, myUid]);

  /* ===== FILE PREVIEW ===== */
  useEffect(() => {
    const urls = files.map((f) => ({
      file: f,
      url: URL.createObjectURL(f),
    }));
    setPreviews(urls);
    return () => urls.forEach((p) => URL.revokeObjectURL(p.url));
  }, [files]);

  /* ===== SEND MESSAGE ===== */
  const send = async () => {
    if (!chatId) return;
    if (!text.trim() && files.length === 0 && !audioBlob) return;

    const msgText = text.trim();
    setText("");
    setReply(null);
    setFiles([]);
    setPreviews([]);
    setAudioBlob(null);
    setShowEmoji(false);

    const uploaded = [];
    for (const f of files) {
      const url = await uploadToCloudinary(f);
      uploaded.push({
        url,
        type: f.type.startsWith("image")
          ? "image"
          : f.type.startsWith("video")
          ? "video"
          : "file",
        name: f.name,
      });
    }

    let audioUrl = null;
    if (audioBlob) {
      audioUrl = await uploadToCloudinary(
        new File([audioBlob], "voice.webm", { type: "audio/webm" })
      );
    }

    await addDoc(collection(db, "privateChats", chatId, "messages"), {
      text: msgText,
      from: myUid,
      createdAt: serverTimestamp(),
      replyTo: reply ? { text: reply.text, from: reply.from, name: reply.fromName || other.name } : null,
      files: uploaded,
      audio: audioUrl,
      readBy: { [myUid]: true },
      deletedFor: [],
      reactions: {},
    });

    // Update last message metadata for sidebar preview
    await setDoc(chatRef, {
      lastMessage: msgText || (uploaded.length > 0 ? "📎 Media" : audioUrl ? "🎤 Voice" : ""),
      lastMessageTime: serverTimestamp(),
      lastMessageFrom: myUid,
    }, { merge: true });

    scrollToBottom();
  };

  /* ===== KEY HANDLER ===== */
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  /* ===== DELETE ===== */
  const deleteForMe = async (m) => {
    await updateDoc(doc(db, "privateChats", chatId, "messages", m.id), {
      deletedFor: [...(m.deletedFor || []), myUid],
    });
    setContextMenu(null);
  };

  const deleteForEveryone = async (m) => {
    if (m.from !== myUid) return;
    await updateDoc(doc(db, "privateChats", chatId, "messages", m.id), {
      text: "🚫 Pesan dihapus",
      files: [],
      audio: null,
      deleted: true,
    });
    setContextMenu(null);
  };

  /* ===== FORWARD ===== */
  const forwardMessage = async (m) => {
    await addDoc(collection(db, "privateChats", chatId, "messages"), {
      text: m.text,
      from: myUid,
      forwardedFrom: m.from,
      createdAt: serverTimestamp(),
      readBy: { [myUid]: true },
      files: m.files || [],
      deletedFor: [],
      reactions: {},
    });
    setContextMenu(null);
  };

  /* ===== REACTIONS ===== */
  const addReaction = async (m, emoji) => {
    const reactions = { ...(m.reactions || {}) };
    if (reactions[myUid] === emoji) {
      delete reactions[myUid];
    } else {
      reactions[myUid] = emoji;
    }
    await updateDoc(doc(db, "privateChats", chatId, "messages", m.id), {
      reactions,
    });
    setContextMenu(null);
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

  /* ===== CONTEXT MENU ===== */
  const handleContextMenu = (e, m) => {
    e.preventDefault();
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 200),
      y: Math.min(e.clientY, window.innerHeight - 300),
      message: m,
    });
  };

  /* ===== SEARCH MESSAGES ===== */
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return messages.filter(
      (m) => m.text?.toLowerCase().includes(q) && !m.deletedFor?.includes(myUid)
    );
  }, [messages, searchQuery, myUid]);

  /* ===== RENDER ===== */
  if (!chatId) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p>Chat tidak valid</p>
        <button className="btn btn-primary" onClick={onBack}>Kembali</button>
      </div>
    );
  }

  return (
    <>
      {/* HEADER */}
      <div className="chat-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <img
          src={other.photo || "/logo192.png"}
          alt={other.name}
          className="chat-header-avatar"
          onClick={() => setShowProfile(!showProfile)}
          style={{ cursor: "pointer" }}
        />
        <div className="chat-header-info">
          <div className="chat-header-name">{other.name || "User"}</div>
          <div className={`chat-header-status ${online ? "online" : ""}`}>
            {typing ? (
              <span style={{ color: "var(--primary)" }}>mengetik...</span>
            ) : online ? (
              "Online"
            ) : lastSeen ? (
              `Terakhir dilihat ${formatLastSeen(lastSeen)}`
            ) : (
              "Offline"
            )}
          </div>
        </div>
        <div className="chat-header-actions">
          <button className="icon-btn" onClick={() => setSearchOpen(!searchOpen)} title="Cari pesan">
            🔍
          </button>
          <button className="icon-btn" title="Panggilan video">📹</button>
          <button className="icon-btn" title="Panggilan suara">📞</button>
        </div>
      </div>

      {/* SEARCH PANEL */}
      {searchOpen && (
        <div className="search-messages-panel">
          <div className="search-messages-header">
            <input
              className="search-messages-input"
              placeholder="Cari pesan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <button className="icon-btn" onClick={() => { setSearchOpen(false); setSearchQuery(""); }}>
              ✕
            </button>
          </div>
          <div className="search-messages-results">
            {searchResults.map((m) => (
              <div key={m.id} className="search-result-item">
                <div className="search-result-date">
                  {m.createdAt?.toDate?.()?.toLocaleString() || ""}
                </div>
                <div className="search-result-text">{m.text}</div>
              </div>
            ))}
            {searchQuery && searchResults.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)", fontSize: 14 }}>
                Tidak ada hasil
              </div>
            )}
          </div>
        </div>
      )}

      {/* MESSAGES */}
      <div
        className="chat-messages"
        ref={chatBoxRef}
        onScroll={handleScroll}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const droppedFiles = Array.from(e.dataTransfer.files);
          if (droppedFiles.length > 0) setFiles((prev) => [...prev, ...droppedFiles]);
        }}
      >
        {dragOver && (
          <div className="drop-overlay">
            <div className="drop-overlay-text">📎 Drop file di sini</div>
          </div>
        )}
        <div className="chat-messages-inner">
          {/* Empty state */}
          {messages.length === 0 && (
            <div className="empty-state" style={{ minHeight: "100%" }}>
              <div className="empty-state-icon">🔐</div>
              <div className="empty-state-title">Mulai percakapan</div>
              <div className="empty-state-text">
                Pesan yang kamu kirim ke {other.name || "user ini"} akan muncul di sini.
                Kirim pesan pertamamu!
              </div>
            </div>
          )}
          {messages.map((m, i) => {
            if (m.deletedFor?.includes(myUid)) return null;

            const isMine = m.from === myUid;
            const showDate = i === 0 || !isSameDay(
              messages[i - 1]?.createdAt?.toDate?.(),
              m.createdAt?.toDate?.()
            );

            const reactions = m.reactions || {};
            const reactionCounts = {};
            Object.values(reactions).forEach((r) => {
              reactionCounts[r] = (reactionCounts[r] || 0) + 1;
            });

            return (
              <div key={m.id}>
                {showDate && m.createdAt?.toDate && (
                  <div className="date-separator">
                    <span>{formatDate(m.createdAt.toDate())}</span>
                  </div>
                )}

                <div
                  className={`message-row ${isMine ? "sent" : "received"}`}
                  onContextMenu={(e) => handleContextMenu(e, m)}
                  onDoubleClick={() => setReply(m)}
                >
                  <div className={`message-bubble ${m.deleted ? "deleted" : ""}`}>
                    {/* Actions trigger */}
                    <div className="message-actions-trigger">
                      <button onClick={(e) => handleContextMenu(e, m)}>▾</button>
                    </div>

                    {/* Forwarded */}
                    {m.forwardedFrom && (
                      <div className="message-forwarded">↗ Diteruskan</div>
                    )}

                    {/* Reply */}
                    {m.replyTo && (
                      <div className="message-reply">
                        <div className="message-reply-name">{m.replyTo.name || "User"}</div>
                        <div>{m.replyTo.text}</div>
                      </div>
                    )}

                    {/* Media */}
                    {m.files?.map((f, fi) => (
                      <div key={fi} className="message-media">
                        {f.type === "image" && (
                          <img
                            src={f.url}
                            alt=""
                            onClick={() => setImageViewer(f.url)}
                          />
                        )}
                        {f.type === "video" && (
                          <video src={f.url} controls />
                        )}
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

                    {/* Audio */}
                    {m.audio && (
                      <div className="message-audio">
                        <audio controls src={m.audio} />
                      </div>
                    )}

                    {/* Text */}
                    {m.text && <MessageText text={m.text} />}

                    {/* Footer */}
                    <div className="message-footer">
                      <span className="message-time">
                        {m.createdAt?.toDate?.()?.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        }) || ""}
                      </span>
                      {isMine && (
                        <span className={`message-status ${m.readBy?.[otherUid] ? "read" : "delivered"}`}>
                          {m.readBy?.[otherUid] ? "✓✓" : "✓"}
                        </span>
                      )}
                    </div>

                    {/* Reactions */}
                    {Object.keys(reactionCounts).length > 0 && (
                      <div className="message-reactions">
                        {Object.entries(reactionCounts).map(([emoji, count]) => (
                          <span
                            key={emoji}
                            className={`reaction-badge ${reactions[myUid] === emoji ? "active" : ""}`}
                            onClick={() => addReaction(m, emoji)}
                          >
                            {emoji}
                            {count > 1 && <span className="count">{count}</span>}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing */}
          {typing && (
            <div className="typing-indicator">
              <div className="typing-bubble">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scroll to bottom */}
      {showScrollBtn && (
        <button className="scroll-to-bottom" onClick={scrollToBottom}>↓</button>
      )}

      {/* CONTEXT MENU */}
      {contextMenu && (
        <div className="context-menu-overlay" onClick={() => setContextMenu(null)}>
          <div
            className="context-menu"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Quick Reactions */}
            <div style={{ display: "flex", gap: 4, padding: "8px 12px", borderBottom: "1px solid var(--border-light)" }}>
              {REACTIONS.map((r) => (
                <button
                  key={r}
                  style={{ fontSize: 20, padding: 4, borderRadius: 8, background: "none", cursor: "pointer" }}
                  onClick={() => addReaction(contextMenu.message, r)}
                >
                  {r}
                </button>
              ))}
            </div>

            <button className="context-menu-item" onClick={() => { setReply(contextMenu.message); setContextMenu(null); }}>
              <span className="menu-icon">↩️</span> Balas
            </button>
            <button className="context-menu-item" onClick={() => forwardMessage(contextMenu.message)}>
              <span className="menu-icon">↗️</span> Teruskan
            </button>
            <button className="context-menu-item" onClick={() => { navigator.clipboard.writeText(contextMenu.message.text || ""); setContextMenu(null); }}>
              <span className="menu-icon">📋</span> Salin
            </button>
            <div className="context-menu-divider" />
            <button className="context-menu-item" onClick={() => deleteForMe(contextMenu.message)}>
              <span className="menu-icon">🗑️</span> Hapus untuk saya
            </button>
            {contextMenu.message.from === myUid && (
              <button className="context-menu-item danger" onClick={() => deleteForEveryone(contextMenu.message)}>
                <span className="menu-icon">❌</span> Hapus untuk semua
              </button>
            )}
          </div>
        </div>
      )}

      {/* IMAGE VIEWER */}
      {imageViewer && (
        <div className="image-viewer" onClick={() => setImageViewer(null)}>
          <img src={imageViewer} alt="" />
          <button className="image-viewer-close" onClick={() => setImageViewer(null)}>✕</button>
        </div>
      )}

      {/* INPUT AREA */}
      <div className="chat-input-area">
        {/* Reply Preview */}
        {reply && (
          <div className="reply-preview">
            <div className="reply-preview-content">
              <div className="reply-preview-name">
                {reply.from === myUid ? "Kamu" : other.name}
              </div>
              <div className="reply-preview-text">{reply.text || "📎 Media"}</div>
            </div>
            <button className="reply-preview-close" onClick={() => setReply(null)}>✕</button>
          </div>
        )}

        {/* File Preview */}
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

        {/* Audio Preview */}
        {audioBlob && !recording && (
          <div className="file-preview-bar">
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px" }}>
              <span>🎤</span>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Voice message siap dikirim</span>
              <button
                style={{ fontSize: 12, color: "var(--danger)", background: "none", border: "none", cursor: "pointer" }}
                onClick={() => setAudioBlob(null)}
              >
                Hapus
              </button>
            </div>
          </div>
        )}

        {/* Recording UI */}
        {recording && (
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
        )}

        {/* Input Bar */}
        {!recording && (
          <div className="input-bar">
            <div className="input-left-actions">
              <button className="icon-btn" onClick={() => setShowEmoji(!showEmoji)} title="Emoji">
                😊
              </button>
              <button className="icon-btn" onClick={() => fileRef.current?.click()} title="Lampiran">
                📎
              </button>
              <input
                ref={fileRef}
                type="file"
                multiple
                hidden
                accept="image/*,video/*,.pdf,.doc,.docx,.zip"
                onChange={(e) => setFiles([...files, ...Array.from(e.target.files)])}
              />
            </div>

            <div className="input-container">
              {/* Emoji Picker */}
              {showEmoji && (
                <div className="emoji-picker-container">
                  <div className="emoji-picker">
                    <div className="emoji-grid">
                      {EMOJI_LIST.map((e) => (
                        <button
                          key={e}
                          className="emoji-item"
                          onClick={() => setText((t) => t + e)}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <textarea
                ref={inputRef}
                className="input-field"
                placeholder="Ketik pesan..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
            </div>

            <div className="input-right-actions">
              {text.trim() || files.length > 0 || audioBlob ? (
                <button className="send-btn" onClick={send} title="Kirim">
                  ➤
                </button>
              ) : (
                <button
                  className={`record-btn ${recording ? "recording" : ""}`}
                  onClick={toggleRecord}
                  title="Voice message"
                >
                  🎤
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* PROFILE PANEL */}
      {showProfile && (
        <ProfilePanel
          user={other}
          onClose={() => setShowProfile(false)}
          onReport={(uid) => {
            reportUser(uid);
            setShowProfile(false);
          }}
        />
      )}
    </>
  );
}

/* ===== HELPERS ===== */
function formatLastSeen(date) {
  if (!date) return "";
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return "baru saja";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`;

  if (date.toDateString() === now.toDateString()) {
    return `hari ini pukul ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `kemarin pukul ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  return date.toLocaleDateString([], { day: "numeric", month: "short" }) +
    ` pukul ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function formatDate(date) {
  if (!date) return "";
  const now = new Date();

  if (date.toDateString() === now.toDateString()) return "Hari ini";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Kemarin";

  return date.toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function isSameDay(d1, d2) {
  if (!d1 || !d2) return false;
  return d1.toDateString() === d2.toDateString();
}
