import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, PhoneCall, Search, Send, UserRound } from "lucide-react";
import { supportMessengerService } from "../services/supportMessenger.js";
import { useSocketEvent } from "../context/SocketContext";

function time(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function SupportMessages() {
  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const loadInbox = useCallback(async () => {
    try {
      const response = await supportMessengerService.getConversations();
      setConversations(response?.data || []);
      setError("");
    } catch (err) {
      setError(err?.message || "Unable to load support conversations.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const response = await supportMessengerService.getUsers(search);
      setUsers(response?.data || []);
    } catch (err) {
      setError(err?.message || "Unable to load users.");
    }
  }, [search]);

  const loadSelected = useCallback(async () => {
    if (!selected) return;
    try {
      const response = await supportMessengerService.getMessages(selected.id);
      setMessages(response?.data?.messages || []);
      await supportMessengerService.markRead(selected.id).catch(() => {});
    } catch (err) {
      setError(err?.message || "Unable to load conversation.");
    }
  }, [selected]);

  useEffect(() => { loadInbox(); loadUsers(); }, [loadInbox, loadUsers]);
  useEffect(() => { loadSelected(); }, [loadSelected]);
  useEffect(() => { if (selected) endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, selected]);

  useSocketEvent("support-message-new", useCallback((message = {}) => {
    const conversationId = String(message.conversationId || "");
    if (!conversationId) return;

    setConversations((current) => {
      const existing = current.find((item) => String(item.id) === conversationId);
      if (!existing) {
        void loadInbox();
        return current;
      }
      const updated = {
        ...existing,
        lastMessageAt: message.createdAt || existing.lastMessageAt,
        lastMessagePreview: message.text || existing.lastMessagePreview,
        unreadCount: String(selected?.id) === conversationId ? 0 : (existing.unreadCount || 0) + 1,
      };
      return [updated, ...current.filter((item) => String(item.id) !== conversationId)];
    });

    if (String(selected?.id) !== conversationId || message.senderRole === "admin") return;
    setMessages((current) => {
      const id = String(message._id || "");
      if (id && current.some((item) => String(item._id) === id)) return current;
      return [...current, message];
    });
    void supportMessengerService.markRead(conversationId).catch(() => {});
  }, [loadInbox, selected]));

  const startChat = async (user) => {
    try {
      const response = await supportMessengerService.createConversation(user.id, user.role);
      const conversation = response?.data;
      if (conversation?.id) {
        const entry = { ...conversation, user: { id: user.id, role: user.role, name: user.name }, unreadCount: 0 };
        setConversations((current) => [entry, ...current.filter((item) => item.id !== conversation.id)]);
        setSelected(entry);
      }
    } catch (err) {
      setError(err?.message || "Unable to start conversation.");
    }
  };

  const send = async (event) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || !selected || sending) return;
    try {
      setSending(true);
      const response = await supportMessengerService.sendMessage(selected.id, value);
      if (response?.data) {
        setMessages((current) => {
          const id = String(response.data._id || "");
          if (id && current.some((item) => String(item._id) === id)) return current;
          return [...current, response.data];
        });
      }
      setText("");
      setConversations((current) => current.map((item) => String(item.id) === String(selected.id) ? { ...item, lastMessageAt: response?.data?.createdAt || new Date().toISOString(), lastMessagePreview: value, unreadCount: 0 } : item));
    } catch (err) {
      setError(err?.message || "Message could not be sent.");
    } finally {
      setSending(false);
    }
  };

  const selectedUser = useMemo(() => selected?.user || null, [selected]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Support Messages</h1>
        <p className="mt-1 text-sm text-slate-500">Chat directly with customers and workers — messages update live without refreshing.</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid min-h-[650px] grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-200 p-3">
            <div className="relative"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find customer or worker…" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500" /></div>
          </div>
          <div className="max-h-[560px] overflow-y-auto p-2">
            {loading && <div className="p-4 text-sm text-slate-500">Loading…</div>}
            {conversations.map((conversation) => (
              <button key={conversation.id} type="button" onClick={() => { setSelected(conversation); setConversations((current) => current.map((item) => item.id === conversation.id ? { ...item, unreadCount: 0 } : item)); }} className={`mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${selected?.id === conversation.id ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600"><UserRound size={18} /></div>
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-bold text-slate-800">{conversation.user?.name || "User"}</div><div className="text-[11px] capitalize text-slate-400">{conversation.user?.role || ""}</div><div className="truncate text-xs text-slate-500">{conversation.lastMessagePreview || "No messages yet"}</div></div>
                {conversation.unreadCount > 0 && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">{conversation.unreadCount}</span>}
              </button>
            ))}

            <div className="mt-3 border-t border-slate-100 pt-3">
              <div className="px-2 pb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Start new chat</div>
              {users.map((user) => <button key={`${user.role}-${user.id}`} type="button" onClick={() => startChat(user)} className="mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-slate-50"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500"><UserRound size={16} /></div><div className="min-w-0"><div className="truncate text-sm font-semibold text-slate-700">{user.name}</div><div className="text-xs capitalize text-slate-400">{user.role}</div></div></button>)}
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          {!selected ? <div className="flex h-full items-center justify-center p-8 text-center text-slate-400"><div><MessageCircle size={38} className="mx-auto mb-3 text-slate-300" /><div className="font-semibold text-slate-600">Select a conversation</div><div className="mt-1 text-sm">Choose a customer/worker from the left.</div></div></div> : <>
            <header className="flex items-center gap-3 border-b border-slate-200 px-5 py-4"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600"><UserRound size={18} /></div><div className="min-w-0 flex-1"><div className="truncate font-bold text-slate-900">{selectedUser?.name || "User"}</div><div className="text-xs capitalize text-slate-500">{selectedUser?.role || ""}</div></div><button type="button" onClick={() => window.dispatchEvent(new CustomEvent("fixitnow-admin-start-voice-call", { detail: { bookingId: String(selected.id), targetUserId: String(selectedUser?.id || ""), participantName: selectedUser?.name || "User" } }))} disabled={!selectedUser?.id} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-40" title="Start voice call"><PhoneCall size={15} /> Call</button></header>
            <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-5">{messages.length === 0 ? <div className="flex h-full items-center justify-center text-center text-sm text-slate-500"><div><MessageCircle size={30} className="mx-auto mb-2 text-slate-300" /><div>No messages yet.</div><div className="mt-1">Start the conversation below.</div></div></div> : messages.map((message) => { const mine = message.senderRole === "admin"; return <div key={String(message._id)} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${mine ? "rounded-br-md bg-blue-600 text-white" : "rounded-bl-md bg-white text-slate-800"}`}><div className="whitespace-pre-wrap break-words">{message.text}</div><div className={`mt-1 text-[10px] ${mine ? "text-blue-100" : "text-slate-400"}`}>{time(message.createdAt)}</div></div></div>; })}<div ref={endRef} /></div>
            <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-3"><input value={text} onChange={(event) => setText(event.target.value)} maxLength={2000} placeholder="Reply to user…" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /><button type="submit" disabled={!text.trim() || sending} className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 disabled:opacity-50"><Send size={17} /></button></form>
          </>}
        </section>
      </div>
    </div>
  );
}
