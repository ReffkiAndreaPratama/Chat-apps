import { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, query, doc } from "firebase/firestore";
import { db } from "./firebase";

export default function UserList({
  me,
  dark,
  toggleDark,
  onLogout,
  onSelectUser,
  onSelectGroup,
  onToggleAdmin,
  activeChat,
}) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("chats"); // chats | online | groups
  const [lastMessages, setLastMessages] = useState({}); // { chatId: { text, time } }

  /* ================= LOAD USERS ================= */
  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ uid: d.id, ...d.data() }))
        .filter((u) => u.uid !== me.uid && u.banned !== true);
      setUsers(list);
    });
    return () => unsub();
  }, [me.uid]);

  /* ================= TRACK LAST MESSAGES ================= */
  useEffect(() => {
    // Listen to privateChats collection for last message info
    const unsub = onSnapshot(collection(db, "privateChats"), (snap) => {
      const msgs = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.users?.includes(me.uid)) {
          msgs[d.id] = {
            text: data.lastMessage || "",
            time: data.lastMessageTime?.toDate?.() || null,
            from: data.lastMessageFrom || "",
          };
        }
      });
      setLastMessages(msgs);
    });
    return () => unsub();
  }, [me.uid]);

  /* ================= FILTERED & SORTED ================= */
  const filteredUsers = useMemo(() => {
    let list = [...users];

    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.name?.toLowerCase().includes(s) ||
          u.email?.toLowerCase().includes(s)
      );
    }

    // Sort: online first, then by name
    list.sort((a, b) => {
      if (a.online && !b.online) return -1;
      if (!a.online && b.online) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });

    return list;
  }, [users, search]);

  const onlineCount = users.filter((u) => u.online).length;

  return (
    <>
      {/* Header */}
      <div className="sidebar-header">
        <img
          src={me.photoURL || "/logo192.png"}
          alt={me.displayName}
          className="user-avatar"
        />
        <div style={{ flex: 1 }} />
        <div className="sidebar-header-actions">
          {me.role === "admin" && (
            <button className="icon-btn" onClick={onToggleAdmin} title="Admin Panel">
              ⚙️
            </button>
          )}
          <button className="icon-btn" onClick={() => onSelectGroup("public")} title="Group Chat">
            👥
          </button>
          <button className="icon-btn" onClick={toggleDark} title="Toggle Theme">
            {dark ? "☀️" : "🌙"}
          </button>
          <button className="icon-btn" onClick={onLogout} title="Logout">
            🚪
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Cari atau mulai chat baru"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${tab === "chats" ? "active" : ""}`}
          onClick={() => setTab("chats")}
        >
          Semua
        </button>
        <button
          className={`sidebar-tab ${tab === "online" ? "active" : ""}`}
          onClick={() => setTab("online")}
        >
          Online ({onlineCount})
        </button>
        <button
          className={`sidebar-tab ${tab === "groups" ? "active" : ""}`}
          onClick={() => setTab("groups")}
        >
          Grup
        </button>
      </div>

      {/* Chat List */}
      <div className="chat-list">
        {/* Group Chat Entry */}
        {(tab === "chats" || tab === "groups") && (
          <div
            className={`chat-item ${
              activeChat?.type === "group" ? "active" : ""
            }`}
            onClick={() => onSelectGroup("public")}
          >
            <div className="chat-item-avatar">
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #00a884, #0088cc)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  color: "white",
                }}
              >
                👥
              </div>
            </div>
            <div className="chat-item-content">
              <div className="chat-item-top">
                <span className="chat-item-name">Public Group</span>
                <span className="chat-item-time">Grup</span>
              </div>
              <div className="chat-item-bottom">
                <span className="chat-item-message">
                  Tap untuk bergabung ke grup publik
                </span>
              </div>
            </div>
          </div>
        )}

        {/* User List */}
        {tab !== "groups" &&
          filteredUsers
            .filter((u) => (tab === "online" ? u.online : true))
            .map((u) => (
              <div
                key={u.uid}
                className={`chat-item ${
                  activeChat?.type === "dm" && activeChat?.user?.uid === u.uid
                    ? "active"
                    : ""
                }`}
                onClick={() => onSelectUser(u)}
              >
                <div className="chat-item-avatar">
                  <img
                    src={u.photo || "/logo192.png"}
                    alt={u.name}
                  />
                  {u.online && <div className="online-indicator" />}
                </div>
                <div className="chat-item-content">
                  <div className="chat-item-top">
                    <span className="chat-item-name">
                      {u.name || "User"}
                      {u.role === "admin" && " 👑"}
                    </span>
                    <span className="chat-item-time">
                      {u.online
                        ? "Online"
                        : u.lastSeen?.toDate
                        ? formatTime(u.lastSeen.toDate())
                        : ""}
                    </span>
                  </div>
                  <div className="chat-item-bottom">
                    <span className="chat-item-message">
                      {getLastMessage(me.uid, u.uid, lastMessages) || (u.online ? "Sedang aktif" : u.email || "Tap untuk chat")}
                    </span>
                  </div>
                </div>
              </div>
            ))}

        {/* Empty State */}
        {filteredUsers.length === 0 && tab !== "groups" && (
          <div
            style={{
              padding: "40px 24px",
              textAlign: "center",
              color: "var(--text-secondary)",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
              {search ? "Tidak ditemukan" : "Belum ada kontak"}
            </div>
            <div style={{ fontSize: 13 }}>
              {search
                ? "Coba kata kunci lain"
                : "Ajak teman untuk bergabung!"}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ================= HELPERS ================= */
function formatTime(date) {
  if (!date) return "";
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return "Baru saja";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m lalu`;
  if (diff < 86400000) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Kemarin";

  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

function getLastMessage(myUid, otherUid, lastMessages) {
  const chatId = [myUid, otherUid].sort().join("_");
  const msg = lastMessages[chatId];
  if (!msg || !msg.text) return null;

  const prefix = msg.from === myUid ? "Kamu: " : "";
  const text = msg.text.length > 30 ? msg.text.slice(0, 30) + "..." : msg.text;
  return prefix + text;
}
