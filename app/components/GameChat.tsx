"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { getAccessToken } from "@/app/lib/auth-api";

interface ChatUser {
  id:    number;
  name:  string | null;
  email: string;
}

interface ChatMessage {
  id:        number;
  gameId:    number;
  text:      string;
  createdAt: string;
  user:      ChatUser;
}

interface Props {
  gameId:     number;
  myStatus:   "confirmed" | "waitlist" | null;
  gameStatus: "upcoming" | "cancelled" | "completed";
}

export default function GameChat({ gameId, myStatus, gameStatus }: Props) {
  const canAccess = myStatus === "confirmed" && gameStatus !== "cancelled";
  const canWrite  = myStatus === "confirmed" && gameStatus === "upcoming";

  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [text,      setText]      = useState("");
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef  = useRef<HTMLInputElement | null>(null);

  // Load history via REST
  const loadHistory = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    const res = await fetch(`/api/games/${gameId}/chat`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setMessages(await res.json());
  }, [gameId]);

  // Connect Socket.IO and set up listeners
  useEffect(() => {
    if (!canAccess) return;
    const token = getAccessToken();
    if (!token) return;

    const socket = io({ path: "/api/socket.io", auth: { token } });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join_game", { gameId });
      loadHistory();
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("new_message", (msg: ChatMessage) => {
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
    });

    socket.on("chat_error", (err: { code: string; message: string }) => {
      console.warn("[chat]", err.code, err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [canAccess, gameId, loadHistory]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !canWrite || !connected) return;
    socketRef.current?.emit("send_message", { gameId, text: trimmed });
    setText("");
    inputRef.current?.focus();
  }

  // Not a confirmed participant or game cancelled — stub
  if (!canAccess) {
    return (
      <div style={stubStyle}>
        <span style={{ fontSize: "22px" }}>💬</span>
        <p style={stubTextStyle}>
          {gameStatus === "cancelled"
            ? "Игра отменена — чат недоступен"
            : "Чат доступен только участникам игры"}
        </p>
      </div>
    );
  }

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem("user") ?? "null"); }
    catch { return null; }
  })();

  return (
    <div style={containerStyle}>

      {/* Header */}
      <div style={headerStyle}>
        <span style={titleStyle}>💬 Чат игры</span>
        <span style={{ ...dotStyle, background: connected ? "#22c55e" : "#94a3b8" }} title={connected ? "Подключено" : "Нет соединения"} />
      </div>

      {/* Message list */}
      <div style={listStyle}>
        {messages.length === 0 && (
          <p style={emptyStyle}>Сообщений пока нет. Напишите первым!</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.user.id === currentUser?.id;
          return (
            <div key={msg.id} style={{ ...rowStyle, justifyContent: isMe ? "flex-end" : "flex-start" }}>
              <div style={{
                ...bubbleStyle,
                background:   isMe ? "var(--primary)" : "#f1f5f9",
                color:        isMe ? "#fff" : "var(--foreground)",
                borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
              }}>
                {!isMe && (
                  <p style={senderStyle}>{msg.user.name ?? msg.user.email}</p>
                )}
                <p style={msgTextStyle}>{msg.text}</p>
                <p style={{ ...timeStyle, color: isMe ? "rgba(255,255,255,0.55)" : "var(--muted)" }}>
                  {new Date(msg.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {canWrite ? (
        <form onSubmit={sendMessage} style={formStyle}>
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Написать сообщение…"
            maxLength={500}
            disabled={!connected}
            style={{ ...inputStyle, opacity: connected ? 1 : 0.5 }}
          />
          <button
            type="submit"
            disabled={!text.trim() || !connected}
            style={sendBtnStyle}
            aria-label="Отправить"
          >
            ↑
          </button>
        </form>
      ) : (
        <div style={readonlyBarStyle}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "12px", color: "var(--muted)" }}>
            Игра завершена — чат только для чтения
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Styles ───────────────────────────────────────────────── */

const containerStyle: React.CSSProperties = {
  background:   "#ffffff",
  borderRadius: "var(--radius-lg)",
  boxShadow:    "var(--shadow-drop)",
  display:      "flex",
  flexDirection: "column",
  overflow:     "hidden",
};

const headerStyle: React.CSSProperties = {
  display:    "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding:    "14px 16px",
  borderBottom: "1px solid #e5e7eb",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontWeight: 700,
  fontSize:   "13px",
  color:      "var(--foreground)",
};

const dotStyle: React.CSSProperties = {
  width:        "8px",
  height:       "8px",
  borderRadius: "50%",
  flexShrink:   0,
};

const listStyle: React.CSSProperties = {
  flex:         "1 1 0",
  overflowY:    "auto",
  padding:      "12px 14px",
  display:      "flex",
  flexDirection: "column",
  gap:          "8px",
  minHeight:    "200px",
  maxHeight:    "320px",
};

const emptyStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize:   "13px",
  color:      "var(--muted)",
  textAlign:  "center",
  margin:     "auto",
  padding:    "16px 0",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
};

const bubbleStyle: React.CSSProperties = {
  maxWidth:  "80%",
  padding:   "7px 11px 5px",
};

const senderStyle: React.CSSProperties = {
  margin:     "0 0 2px",
  fontSize:   "11px",
  fontWeight: 700,
  color:      "var(--muted)",
  fontFamily: "var(--font-ui)",
};

const msgTextStyle: React.CSSProperties = {
  margin:      0,
  fontSize:    "14px",
  lineHeight:  "1.4",
  fontFamily:  "var(--font-ui)",
  wordBreak:   "break-word",
  whiteSpace:  "pre-wrap",
};

const timeStyle: React.CSSProperties = {
  margin:     "3px 0 0",
  fontSize:   "10px",
  textAlign:  "right",
  fontFamily: "var(--font-ui)",
};

const formStyle: React.CSSProperties = {
  display:    "flex",
  gap:        "8px",
  padding:    "10px 12px",
  borderTop:  "1px solid #e5e7eb",
};

const inputStyle: React.CSSProperties = {
  flex:         "1 1 0",
  border:       "1.5px solid #e5e7eb",
  borderRadius: "8px",
  padding:      "8px 12px",
  fontFamily:   "var(--font-ui)",
  fontSize:     "14px",
  outline:      "none",
  background:   "#f8fafc",
  color:        "var(--foreground)",
  minWidth:     0,
};

const sendBtnStyle: React.CSSProperties = {
  width:        "36px",
  height:       "36px",
  borderRadius: "50%",
  background:   "var(--primary)",
  color:        "#fff",
  border:       "none",
  cursor:       "pointer",
  fontFamily:   "var(--font-ui)",
  fontSize:     "16px",
  fontWeight:   700,
  flexShrink:   0,
  display:      "flex",
  alignItems:   "center",
  justifyContent: "center",
};

const readonlyBarStyle: React.CSSProperties = {
  padding:    "10px 14px",
  borderTop:  "1px solid #e5e7eb",
  textAlign:  "center",
};

const stubStyle: React.CSSProperties = {
  background:    "#ffffff",
  borderRadius:  "var(--radius-lg)",
  boxShadow:     "var(--shadow-drop)",
  padding:       "24px 20px",
  display:       "flex",
  flexDirection: "column",
  alignItems:    "center",
  gap:           "6px",
};

const stubTextStyle: React.CSSProperties = {
  margin:     0,
  fontFamily: "var(--font-ui)",
  fontSize:   "13px",
  color:      "var(--muted)",
  textAlign:  "center",
};
