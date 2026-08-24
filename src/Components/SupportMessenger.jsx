import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { supportMessengerService } from "../services/supportMessenger.js";
import { useSocketEvent } from "../context/SocketContext.jsx";

export default function SupportMessenger() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const response = await supportMessengerService.list();
      setConversations(response?.data || []);
    } catch {}
  }, []);

  const loadMessages = useCallback(async (id) => {
    setLoading(true);
    try {
      const response = await supportMessengerService.getMessages(id);
      setMessages(response?.data?.messages || []);
      await supportMessengerService.markRead(id).catch(() => {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const onMessage = useCallback((message) => {
    const id = String(message?.conversationId || "");
    if (!id) return;
    if (id === String(selected)) {
      setMessages((current) => current.some((item) => String(item._id) === String(message._id)) ? current : [...current, message]);
      void supportMessengerService.markRead(id).catch(() => {});
    }
    void loadConversations();
  }, [selected, loadConversations]);

  useSocketEvent("message-new", onMessage);

  const send = async (event) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || !selected) return;
    const response = await supportMessengerService.sendMessage(selected, value);
    if (response?.data) setMessages((current) => [...current, response.data]);
    setText("");
    await loadConversations();
  };

  return (
    <div className="grid min-h-[600px] grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[300px_1fr]">
      <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-4 font-bold text-slate-900"><MessageCircle size={19} /> Support Messages</div>
        <div className="max-h-[540px] overflow-y-auto">
          {conversations.map((conversation) => (
            <button key={conversation.conversationId} type="button" onClick={() => { setSelected(conversation.conversationId); loadMessages(conversation.conversationId); }} className={`w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 ${selected === conversation.conversationId ? "bg-orange-50" : ""}`}>
              <div className="font-semibold text-slate-800">{conversation.participant?.name || "User"}</div>
              <div className="mt-1 truncate text-xs text-slate-500">{conversation.lastMessage?.text || "No messages yet"}</div>
              {conversation.unreadCount > 0 && <span className="mt-1 inline-flex rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">{conversation.unreadCount} new</span>}
            </button>
          ))}
          {!conversations.length && <div className="p-6 text-center text-sm text-slate-500">No support conversations yet.</div>}
        </div>
      </aside>
      <section className="flex min-h-[600px] flex-col">
        <header className="border-b border-slate-200 px-5 py-4"><div className="font-bold text-slate-900">{conversations.find((c) => c.conversationId === selected)?.participant?.name || "Select a conversation"}</div></header>
        <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-5">
          {loading ? <div className="text-center text-sm text-slate-500">Loading…</div> : messages.map((message) => {
            const mine = String(message.senderRole) === "admin";
            return <div key={String(message._id)} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-orange-500 text-white" : "bg-white text-slate-800 shadow-sm"}`}>{message.text}</div></div>;
          })}
          {!loading && selected && !messages.length && <div className="text-center text-sm text-slate-500">No messages yet.</div>}
          <div ref={endRef} />
        </div>
        <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-3">
          <input value={text} onChange={(event) => setText(event.target.value)} disabled={!selected} maxLength={2000} placeholder="Reply to user…" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-orange-500" />
          <button type="submit" disabled={!selected || !text.trim()} className="rounded-xl bg-orange-500 px-4 py-3 text-white disabled:opacity-50"><Send size={17} /></button>
        </form>
      </section>
    </div>
  );
}
