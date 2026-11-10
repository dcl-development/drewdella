"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useVisualViewportBottom } from "../../lib/useVisualViewportBottom";
import "./HangoutsChat.css";

const POLL_MS = 4000;
const NAME_KEY = "drewdella-chat-name";
const OPEN_KEY = "drewdella-chat-open";
const MAX_NAME = 24;
const MAX_BODY = 280;

const AVATAR_COLORS = [
  "#db4437",
  "#f4b400",
  "#0f9d58",
  "#4285f4",
  "#ab47bc",
  "#00acc1",
  "#ff7043",
  "#5c6bc0",
];

function avatarColor(name) {
  const text = String(name || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initialOf(name) {
  const ch = String(name || "?").trim().charAt(0);
  return ch ? ch.toUpperCase() : "?";
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function HangoutsChat() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [nameLocked, setNameLocked] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const stickBottom = useRef(true);
  const inputRef = useRef(null);
  const dockBottom = useVisualViewportBottom(12);

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(OPEN_KEY) === "1");
      const saved = localStorage.getItem(NAME_KEY) || "";
      setName(saved);
      setNameLocked(Boolean(saved.trim()));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const mergeMessages = useCallback((incoming) => {
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]));
      for (const msg of incoming) {
        if (!msg?.id) continue;
        byId.set(msg.id, msg);
      }
      return Array.from(byId.values()).sort((a, b) =>
        String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
      );
    });
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/chat");
      const type = res.headers.get("content-type") || "";
      if (!res.ok || !type.includes("application/json")) {
        throw new Error("Couldn’t load chat right now.");
      }
      const data = await res.json();
      mergeMessages(data.messages || []);
      setStatus("");
    } catch (error) {
      setStatus(error.message || "Couldn’t load chat right now.");
    }
  }, [mergeMessages]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(OPEN_KEY, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open, ready]);

  useEffect(() => {
    if (!ready || !name) return;
    try {
      localStorage.setItem(NAME_KEY, name);
    } catch {
      /* ignore */
    }
  }, [name, ready]);

  const showOpen = ready && open;

  useEffect(() => {
    if (!showOpen) return undefined;

    loadMessages();
    const tick = () => {
      if (document.visibilityState === "hidden") return;
      loadMessages();
    };
    const id = window.setInterval(tick, POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") loadMessages();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [showOpen, loadMessages]);

  useEffect(() => {
    if (!showOpen || !stickBottom.current) return;
    scrollToBottom();
  }, [messages, showOpen, scrollToBottom]);

  useEffect(() => {
    if (!showOpen) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 180);
    return () => window.clearTimeout(t);
  }, [showOpen]);

  const onListScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stickBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  };

  const lockName = () => {
    const cleaned = name.trim().slice(0, MAX_NAME);
    if (!cleaned) {
      setStatus("Pick a name first.");
      return false;
    }
    setName(cleaned);
    setNameLocked(true);
    setStatus("");
    return true;
  };

  const send = async (event) => {
    event.preventDefault();
    if (!nameLocked && !lockName()) return;

    const cleanedName = name.trim().slice(0, MAX_NAME);
    const cleanedBody = draft.trim().slice(0, MAX_BODY);
    if (!cleanedName) {
      setStatus("Pick a name first.");
      return;
    }
    if (!cleanedBody || sending) return;

    setSending(true);
    setStatus("");
    const tempId = `local-${Date.now()}`;
    const optimistic = {
      id: tempId,
      name: cleanedName,
      body: cleanedBody,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    mergeMessages([optimistic]);
    setDraft("");
    stickBottom.current = true;
    requestAnimationFrame(scrollToBottom);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanedName, body: cleanedBody }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "send failed");

      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        const byId = new Map(withoutTemp.map((m) => [m.id, m]));
        if (data.message?.id) byId.set(data.message.id, data.message);
        return Array.from(byId.values()).sort((a, b) =>
          String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
        );
      });
    } catch (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setDraft(cleanedBody);
      setStatus(error.message || "Couldn’t send. Try again.");
    } finally {
      setSending(false);
    }
  };

  const myName = name.trim().toLowerCase();

  return (
    <div
      className={`hangouts${showOpen ? " hangouts--open" : ""}`}
      style={{ bottom: dockBottom }}
    >
      {showOpen ? (
        <div className="hangouts-window" role="dialog" aria-label="Chat">
          <div className="hangouts-bar">
            <span className="hangouts-bar-dot" aria-hidden />
            <div className="hangouts-bar-copy">
              <span className="hangouts-bar-title">Hangouts</span>
            </div>
            <button
              type="button"
              className="hangouts-bar-min"
              onClick={() => setOpen(false)}
              aria-label="Minimize chat"
            >
              –
            </button>
          </div>

          <div
            className="hangouts-list"
            ref={listRef}
            onScroll={onListScroll}
          >
            {messages.length === 0 ? (
              <div className="hangouts-empty">
                <span className="hangouts-empty-icon" aria-hidden />
                <p>Nobody’s talking yet.</p>
                <p>Say hi — messages stick around.</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const prev = messages[i - 1];
                const sameAsPrev =
                  prev &&
                  prev.name.trim().toLowerCase() === msg.name.trim().toLowerCase();
                const mine =
                  myName && msg.name.trim().toLowerCase() === myName;
                return (
                  <div
                    key={msg.id}
                    className={`hangouts-row${sameAsPrev ? " hangouts-row--continued" : ""}${
                      msg.pending ? " hangouts-row--pending" : ""
                    }${mine ? " hangouts-row--mine" : ""}`}
                  >
                    {sameAsPrev ? (
                      <span className="hangouts-avatar hangouts-avatar--spacer" aria-hidden />
                    ) : (
                      <span
                        className="hangouts-avatar"
                        style={{ background: avatarColor(msg.name) }}
                        aria-hidden
                      >
                        {initialOf(msg.name)}
                      </span>
                    )}
                    <div className="hangouts-bubble">
                      {!sameAsPrev ? (
                        <div className="hangouts-meta">
                          <strong>{msg.name}</strong>
                          <span>{formatTime(msg.createdAt)}</span>
                        </div>
                      ) : null}
                      <p>{msg.body}</p>
                      {sameAsPrev ? (
                        <span className="hangouts-time-inline">
                          {formatTime(msg.createdAt)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form className="hangouts-compose" onSubmit={send}>
            {nameLocked ? (
              <div className="hangouts-identity">
                <span
                  className="hangouts-avatar hangouts-avatar--sm"
                  style={{ background: avatarColor(name) }}
                  aria-hidden
                >
                  {initialOf(name)}
                </span>
                <span className="hangouts-identity-label">
                  Chatting as <strong>{name}</strong>
                </span>
                <button
                  type="button"
                  className="hangouts-identity-edit"
                  onClick={() => setNameLocked(false)}
                >
                  Change
                </button>
              </div>
            ) : (
              <input
                className="hangouts-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, MAX_NAME))}
                onBlur={() => {
                  if (name.trim()) lockName();
                }}
                placeholder="Your name"
                maxLength={MAX_NAME}
                autoComplete="nickname"
                aria-label="Your name"
              />
            )}
            <div className="hangouts-input-row">
              <input
                ref={inputRef}
                className="hangouts-input"
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, MAX_BODY))}
                placeholder="Send a message"
                maxLength={MAX_BODY}
                autoComplete="off"
                aria-label="Message"
              />
              <button
                type="submit"
                className="hangouts-send"
                disabled={sending || !draft.trim()}
              >
                Send
              </button>
            </div>
            {status ? <p className="hangouts-status">{status}</p> : null}
          </form>
        </div>
      ) : null}

      <button
        type="button"
        className={`hangouts-launcher${showOpen ? " hangouts-launcher--open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Hide chat" : "Open Hangouts"}
        aria-expanded={open}
      >
        <span className="hangouts-launcher-mark" aria-hidden>
          {showOpen ? (
            <svg viewBox="0 0 24 24" className="hangouts-launcher-x">
              <path
                fill="currentColor"
                d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          ) : (
            <span className="hangouts-launcher-icon" />
          )}
        </span>
      </button>
    </div>
  );
}

export default HangoutsChat;
