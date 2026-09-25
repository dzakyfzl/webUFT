"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { sendChatMessage, type ChatMessage } from "../lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOrCreateSessionId(): string {
  const KEY = "angie_session_id";
  if (typeof window === "undefined") return `sess_${Date.now()}`;
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

function resetSessionId(): string {
  const KEY = "angie_session_id";
  const newId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  if (typeof window !== "undefined") {
    sessionStorage.setItem(KEY, newId);
  }
  return newId;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="cw-typing" aria-label="Angie sedang mengetik...">
      <span />
      <span />
      <span />
    </div>
  );
}

// Format message content — handles **bold** and newlines
function FormattedMessage({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="cw-msg-content">
      {lines.map((line, li) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={li} className={line === "" ? "cw-empty-line" : ""}>
            {parts.map((part, pi) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={pi}>{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
}

// Quick reply suggestions
const QUICK_REPLIES = [
  "Apa itu UFT?",
  "Cara daftar anggota?",
  "Jadwal acara & pameran?",
  "Cara submit karya galeri?",
];

// ─── Main Widget ──────────────────────────────────────────────────────────────

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>(getOrCreateSessionId);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messages.length > 0 || loading) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      const t = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const addMessage = useCallback(
    (role: "user" | "assistant", content: string) => {
      setMessages((prev) => [...prev, { role, content }]);
      if (role === "assistant" && !open) setUnread((n) => n + 1);
    },
    [open],
  );

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      setShowQuickReplies(false);
      setInput("");
      addMessage("user", trimmed);
      setLoading(true);
      try {
        const res = await sendChatMessage(trimmed, sessionId);
        addMessage("assistant", res.reply);
      } catch {
        addMessage(
          "assistant",
          "Maaf, Angie sedang mengalami gangguan koneksi. Silakan coba kembali sesaat lagi ya!",
        );
      } finally {
        setLoading(false);
      }
    },
    [loading, sessionId, addMessage],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const handleResetChat = () => {
    const newId = resetSessionId();
    setSessionId(newId);
    setMessages([]);
    setShowQuickReplies(true);
  };

  const isFirstOpen = messages.length === 0;

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className={`cw-backdrop ${open ? "cw-backdrop--vis" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      {/* ── FAB Toggle ── */}
      <button
        id="chat-fab"
        className={`cw-fab ${open ? "cw-fab--hidden" : ""}`}
        aria-label={open ? "Tutup chat Angie" : "Tanya Angie"}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <circle cx="9" cy="10" r="1" fill="currentColor" />
          <circle cx="12" cy="10" r="1" fill="currentColor" />
          <circle cx="15" cy="10" r="1" fill="currentColor" />
        </svg>
        {unread > 0 && (
          <span className="cw-fab-badge">{unread}</span>
        )}
        <span className="cw-fab-tooltip">Tanya Angie</span>
      </button>

      {/* ── Floating Chat Panel ── */}
      <div
        id="chat-panel"
        className={`cw-panel ${open ? "cw-panel--open" : ""}`}
        aria-hidden={!open}
        role="dialog"
        aria-label="Panel Chat Angie"
      >
        {/* Header */}
        <div className="cw-header">
          <div className="cw-header-brand">
            <div className="cw-avatar" aria-hidden="true">A</div>
            <h2 className="cw-header-title">Angie</h2>
          </div>
          <div className="cw-header-actions">
            {messages.length > 0 && (
              <button
                type="button"
                className="cw-header-btn"
                onClick={handleResetChat}
                title="Mulai percakapan baru"
                aria-label="Mulai percakapan baru"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M3 21v-5h5" />
                </svg>
              </button>
            )}
            <button
              type="button"
              className="cw-header-btn cw-header-btn--close"
              onClick={() => setOpen(false)}
              title="Tutup chat"
              aria-label="Tutup panel chat"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="cw-messages" role="log" aria-live="polite">
          {/* Welcome */}
          {isFirstOpen && (
            <div className="cw-welcome">
              <div className="cw-welcome-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" />
                  <line x1="12" y1="2" x2="12" y2="5" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="5" y2="12" />
                  <line x1="19" y1="12" x2="22" y2="12" />
                </svg>
              </div>
              <div>
                <p className="cw-welcome-greeting">
                  Halo! Aku <strong>Angie</strong>.
                </p>
                <p className="cw-welcome-desc">
                  Ada yang ingin kamu tanyakan seputar kegiatan, pameran karya, hunting foto, atau pendaftaran UKM Fotografi Telkom University?
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`cw-row ${msg.role === "user" ? "cw-row--user" : "cw-row--bot"}`}
            >
              {msg.role === "assistant" && (
                <div className="cw-row-avatar" aria-hidden="true">A</div>
              )}
              <div className={`cw-bubble ${msg.role === "user" ? "cw-bubble--user" : "cw-bubble--bot"}`}>
                <FormattedMessage text={msg.content} />
              </div>
            </div>
          ))}

          {loading && (
            <div className="cw-row cw-row--bot">
              <div className="cw-row-avatar" aria-hidden="true">A</div>
              <div className="cw-bubble cw-bubble--bot cw-bubble--typing">
                <TypingDots />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Quick replies — no label */}
        {showQuickReplies && (
          <div className="cw-quick">
            {QUICK_REPLIES.map((qr) => (
              <button
                key={qr}
                type="button"
                className="cw-quick-btn"
                onClick={() => handleSend(qr)}
                disabled={loading}
              >
                {qr}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="cw-input-area">
          <div className="cw-input-row">
            <input
              ref={inputRef}
              id="chat-input"
              className="cw-input"
              type="text"
              placeholder="Tanyakan sesuatu pada Angie..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              maxLength={500}
              autoComplete="off"
            />
            <button
              id="chat-send-btn"
              type="button"
              className="cw-send"
              onClick={() => handleSend(input)}
              disabled={loading || !input.trim()}
              aria-label="Kirim pesan"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Styles ── */}
      <style>{`
        /* ═══════════════════════════════════════════════════════════════
           ANGIE CHATBOT — UKM FOTOGRAFI TELKOM
           Light palette: white + stone-50 + slate text + red-600 accent
           Floating panel (not edge-flush), rounded corners
        ═══════════════════════════════════════════════════════════════ */

        /* ── Backdrop ── */
        .cw-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9998;
          background: rgba(15, 23, 42, 0.25);
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }
        .cw-backdrop--vis {
          opacity: 1;
          pointer-events: auto;
        }

        /* ── FAB ── */
        .cw-fab {
          position: fixed;
          bottom: 28px;
          right: 28px;
          z-index: 9997;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #dc2626;
          color: #fff;
          box-shadow:
            0 6px 20px rgba(220, 38, 38, 0.4),
            0 2px 6px rgba(0, 0, 0, 0.15);
          transition:
            transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 0.25s ease,
            opacity 0.2s ease;
        }
        .cw-fab:hover {
          transform: scale(1.08) translateY(-2px);
          box-shadow:
            0 10px 28px rgba(220, 38, 38, 0.5),
            0 4px 10px rgba(0, 0, 0, 0.18);
        }
        .cw-fab:active { transform: scale(0.95); }
        .cw-fab--hidden {
          opacity: 0;
          pointer-events: none;
          transform: scale(0.8);
        }

        /* Tooltip */
        .cw-fab-tooltip {
          position: absolute;
          right: 66px;
          white-space: nowrap;
          background: #ffffff;
          color: #0f172a;
          font-size: 12px;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 9999px;
          border: 1px solid #e7e5e4;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          pointer-events: none;
          opacity: 0;
          transform: translateX(6px);
          transition: opacity 0.15s ease, transform 0.15s ease;
        }
        .cw-fab:hover .cw-fab-tooltip {
          opacity: 1;
          transform: translateX(0);
        }

        /* Badge */
        .cw-fab-badge {
          position: absolute;
          top: -3px;
          right: -3px;
          min-width: 20px;
          height: 20px;
          border-radius: 10px;
          background: #dc2626;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 5px;
          border: 2px solid #fff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.15);
          animation: cw-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes cw-pop {
          from { transform: scale(0); }
          to   { transform: scale(1); }
        }

        /* ── Floating Panel ── */
        .cw-panel {
          position: fixed;
          bottom: 20px;
          right: 20px;
          top: 20px;
          width: 420px;
          max-width: calc(100vw - 40px);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-radius: 20px;
          background: #ffffff;
          border: 1px solid #e7e5e4;
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.12),
            0 4px 16px rgba(0, 0, 0, 0.06);
          transform: translateY(16px) scale(0.97);
          opacity: 0;
          pointer-events: none;
          transition:
            transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
            opacity 0.25s ease;
          font-family: var(--font-geist-sans), system-ui, sans-serif;
        }
        .cw-panel--open {
          transform: translateY(0) scale(1);
          opacity: 1;
          pointer-events: auto;
        }

        /* ── Header ── */
        .cw-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid #f5f5f4;
          flex-shrink: 0;
          background: #ffffff;
        }
        .cw-header-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .cw-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #dc2626;
          color: #fff;
          font-weight: 800;
          font-size: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(220, 38, 38, 0.25);
        }
        .cw-header-title {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.01em;
        }

        .cw-header-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .cw-header-btn {
          background: transparent;
          border: 1px solid #e7e5e4;
          color: #a8a29e;
          cursor: pointer;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .cw-header-btn:hover {
          background: #fafaf9;
          color: #44403c;
          border-color: #d6d3d1;
        }
        .cw-header-btn--close:hover {
          background: #fef2f2;
          color: #dc2626;
          border-color: #fecaca;
        }

        /* ── Messages ── */
        .cw-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #fafaf9;
          scrollbar-width: thin;
          scrollbar-color: #d6d3d1 transparent;
        }
        .cw-messages::-webkit-scrollbar { width: 4px; }
        .cw-messages::-webkit-scrollbar-track { background: transparent; }
        .cw-messages::-webkit-scrollbar-thumb {
          background: #d6d3d1;
          border-radius: 4px;
        }

        /* ── Welcome ── */
        .cw-welcome {
          display: flex;
          gap: 12px;
          padding: 14px;
          background: #ffffff;
          border: 1px solid #f5f5f4;
          border-left: 3px solid #dc2626;
          border-radius: 12px;
          margin-bottom: 2px;
        }
        .cw-welcome-icon {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: #fef2f2;
          color: #dc2626;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .cw-welcome-greeting {
          margin: 0 0 4px;
          font-size: 13.5px;
          font-weight: 600;
          color: #0f172a;
        }
        .cw-welcome-greeting strong { color: #dc2626; }
        .cw-welcome-desc {
          margin: 0;
          font-size: 12.5px;
          line-height: 1.5;
          color: #78716c;
        }

        /* ── Bubble rows ── */
        .cw-row {
          display: flex;
          gap: 8px;
          align-items: flex-start;
          width: 100%;
        }
        .cw-row--user { justify-content: flex-end; }
        .cw-row--bot  { justify-content: flex-start; }

        .cw-row-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #dc2626;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 3px;
        }

        .cw-bubble {
          max-width: 82%;
          padding: 10px 14px;
          border-radius: 14px;
          font-size: 13px;
          line-height: 1.55;
          animation: cw-in 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          word-break: break-word;
        }
        @keyframes cw-in {
          from { opacity: 0; transform: translateY(5px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .cw-bubble--user {
          background: #dc2626;
          color: #ffffff;
          border-bottom-right-radius: 4px;
          box-shadow: 0 2px 8px rgba(220, 38, 38, 0.2);
        }
        .cw-bubble--bot {
          background: #ffffff;
          color: #1c1917;
          border: 1px solid #f5f5f4;
          border-bottom-left-radius: 4px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
        }

        .cw-msg-content p { margin: 0 0 4px; }
        .cw-msg-content p:last-child { margin-bottom: 0; }
        .cw-msg-content .cw-empty-line { height: 6px; }
        .cw-msg-content strong { font-weight: 700; }

        /* Typing */
        .cw-bubble--typing { padding: 10px 14px; }
        .cw-typing {
          display: flex;
          gap: 5px;
          align-items: center;
        }
        .cw-typing span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #dc2626;
          animation: cw-bounce 1.3s infinite ease-in-out;
        }
        .cw-typing span:nth-child(2) { animation-delay: 0.16s; }
        .cw-typing span:nth-child(3) { animation-delay: 0.32s; }
        @keyframes cw-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
          30% { transform: translateY(-5px); opacity: 1; }
        }

        /* ── Quick replies (no label) ── */
        .cw-quick {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 8px 14px 10px;
          background: #ffffff;
          border-top: 1px solid #f5f5f4;
          flex-shrink: 0;
        }
        .cw-quick-btn {
          background: #ffffff;
          border: 1px solid #e7e5e4;
          color: #44403c;
          border-radius: 9999px;
          padding: 5px 12px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.1s;
          white-space: nowrap;
        }
        .cw-quick-btn:hover:not(:disabled) {
          background: #dc2626;
          border-color: #dc2626;
          color: #fff;
          transform: translateY(-1px);
        }
        .cw-quick-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* ── Input ── */
        .cw-input-area {
          padding: 10px 14px 14px;
          background: #ffffff;
          border-top: 1px solid #f5f5f4;
          flex-shrink: 0;
        }
        .cw-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fafaf9;
          border: 1px solid #e7e5e4;
          border-radius: 12px;
          padding: 3px 5px 3px 14px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .cw-input-row:focus-within {
          border-color: #dc2626;
          box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.12);
        }
        .cw-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #0f172a;
          font-size: 13px;
          padding: 8px 0;
          caret-color: #dc2626;
        }
        .cw-input::placeholder { color: #a8a29e; }
        .cw-input:disabled { opacity: 0.5; cursor: not-allowed; }

        .cw-send {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          background: #dc2626;
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, transform 0.15s;
          flex-shrink: 0;
        }
        .cw-send:hover:not(:disabled) {
          background: #b91c1c;
          transform: translateY(-1px);
        }
        .cw-send:disabled {
          opacity: 0.3;
          cursor: not-allowed;
          background: #d6d3d1;
        }

        /* ── Mobile ── */
        @media (max-width: 639px) {
          .cw-panel {
            top: 12px;
            right: 12px;
            bottom: 12px;
            left: 12px;
            width: auto;
            max-width: none;
            border-radius: 16px;
          }
          .cw-fab {
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
          }
          .cw-fab-tooltip { display: none; }
          .cw-bubble { max-width: 88%; }
        }
      `}</style>
    </>
  );
}
