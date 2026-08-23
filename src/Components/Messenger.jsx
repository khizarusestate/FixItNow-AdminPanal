import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle, Search, Send, UserRound, Users, X } from "lucide-react";
import { apiRequest, getStoredAdminSession } from "../lib/api";
import { useSocketEvent } from "../context/SocketContext";

const typeLabel = {
  worker: "Worker",
  customer: "Customer",
  admin: "Admin",
  super_admin: "Super Admin",
};

function ContactAvatar({ contact, large = false }) {
  const size = large ? "h-12 w-12" : "h-10 w-10";
  if (contact?.avatar) {
    return <img src={contact.avatar} alt="" className={`${size} rounded-full object-cover`} />;
  }
  return (
    <div className={`${size} rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0`}>
      <UserRound size={large ? 22 : 18} />
    </div>
  );
}

export default function Messenger() {
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const session = getStoredAdminSession();
  const myId = String(session?.id || "");

  const loadContacts = useCallback(async () => {
    try {
      const response = await apiRequest(
        `/admin/messenger/contacts${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""}`,
      );
      setContacts(Array.isArray(response?.data) ? response.data : []);
    } catch (err) {
      setError(err.message || "Unable to load contacts.");
    }
  }, [search]);

  const loadConversations = useCallback(async () => {
    try {
      const response = await apiRequest("/admin/messenger/conversations");
      setConversations(Array.isArray(response?.data) ? response.data : []);
    } catch (err) {
      setError(err.message || "Unable to load conversations.");
    }
  }, []);

  const openConversation = useCallback(async (contact) => {
    setSelected(contact);
    setError("");
    try {
      const response = await apiRequest(`/admin/messenger/${contact.type}/${contact.id}`);
      setMessages(Array.isArray(response?.data?.messages) ? response.data.messages : []);
      await loadConversations();
    } catch (err) {
      setMessages([]);
      setError(err.message || "Unable to load conversation.");
    }
  }, [loadConversations]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      await Promise.all([loadContacts(), loadConversations()]);
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [loadContacts, loadConversations]);

  useSocketEvent("messenger-message", useCallback((message) => {
    if (!message) return;
    const isCurrentConversation = selected &&
      ((String(message.senderId) === String(selected.id) && message.senderType === selected.type) ||
       (String(message.recipientId) === String(selected.id) && message.recipientType === selected.type));
    if (isCurrentConversation) {
      setMessages((prev) => prev.some((item) => String(item.id || item._id) === String(message.id)) ? prev : [...prev, message]);
      if (String(message.recipientId) === myId) {
        apiRequest(`/admin/messenger/read/${selected.type}/${selected.id}`, { method: "PATCH" }).catch(() => {});
      }
    }
    loadConversations();
    loadContacts();
  }, [selected, myId, loadConversations, loadContacts]));

  useSocketEvent("messenger-refresh", useCallback(() => {
    loadConversations();
  }, [loadConversations]));

  const filteredContacts = useMemo(() => {
    if (filter === "all") return contacts;
    return contacts.filter((contact) => contact.type === filter);
  }, [contacts, filter]);

  const conversationContactIds = useMemo(
    () => new Set(conversations.map((item) => `${item.contact?.type}:${item.contact?.id}`)),
    [conversations],
  );

  const visibleContacts = useMemo(() => {
    const recent = [];
    const rest = [];
    filteredContacts.forEach((contact) => {
      if (conversationContactIds.has(`${contact.type}:${contact.id}`)) recent.push(contact);
      else rest.push(contact);
    });
    return [...recent, ...rest];
  }, [filteredContacts, conversationContactIds]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!selected || !text || sending) return;
    setSending(true);
    setError("");
    try {
      const response = await apiRequest("/admin/messenger/send", {
        method: "POST",
        body: JSON.stringify({
          recipientType: selected.type,
          recipientId: selected.id,
          body: text,
        }),
      });
      const message = response?.data;
      if (message) setMessages((prev) => [...prev, message]);
      setDraft("");
      await loadConversations();
    } catch (err) {
      setError(err.message || "Message could not be sent.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] min-h-[620px] rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm flex flex-col">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <MessageCircle size={23} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Messenger</h1>
            <p className="text-sm text-slate-500">Message workers, customers and admin accounts.</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Real-time messaging
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[310px_minmax(0,1fr)]">
        <aside className={`${selected ? "hidden md:flex" : "flex"} flex-col min-h-0 border-r border-slate-200 bg-slate-50`}>
          <div className="p-3 space-y-3 border-b border-slate-200">
            <div className="relative">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search people..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto">
              {["all", "worker", "customer", "admin"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${filter === item ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
                >
                  {item === "all" ? "All" : typeLabel[item]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="py-10 text-center text-sm text-slate-500">Loading contacts...</div>
            ) : visibleContacts.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">No contacts found.</div>
            ) : (
              visibleContacts.map((contact) => {
                const conversation = conversations.find((item) => item.contact?.id === contact.id && item.contact?.type === contact.type);
                const active = selected?.id === contact.id && selected?.type === contact.type;
                return (
                  <button
                    key={`${contact.type}:${contact.id}`}
                    type="button"
                    onClick={() => openConversation(contact)}
                    className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition ${active ? "bg-indigo-50" : "hover:bg-white"}`}
                  >
                    <div className="relative">
                      <ContactAvatar contact={contact} />
                      {contact.isOnline && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-50 bg-emerald-500" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-slate-800">{contact.name}</p>
                        {conversation?.unreadCount > 0 && <span className="rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold text-white">{conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}</span>}
                      </div>
                      <p className="truncate text-xs text-slate-500">{typeLabel[contact.type]}{conversation?.lastMessage ? ` · ${conversation.lastMessage.body}` : ""}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className={`${selected ? "flex" : "hidden md:flex"} min-w-0 flex-col bg-white`}>
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Users size={30} /></div>
                <h2 className="text-lg font-bold text-slate-800">Select a conversation</h2>
                <p className="mt-1 text-sm text-slate-500">Choose a worker, customer or admin from the left.</p>
              </div>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
                <button type="button" onClick={() => setSelected(null)} className="md:hidden rounded-lg p-2 hover:bg-slate-100" aria-label="Back"><X size={18} /></button>
                <ContactAvatar contact={selected} large />
                <div className="min-w-0">
                  <h2 className="truncate font-bold text-slate-900">{selected.name}</h2>
                  <p className="text-xs text-slate-500">{typeLabel[selected.type]} · {selected.isOnline ? "Online" : "Offline"}</p>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto bg-slate-50 p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-slate-500">No messages yet. Start the conversation.</div>
                ) : messages.map((message, index) => {
                  const mine = String(message.senderId) === myId && (message.senderType === "admin" || message.senderType === "super_admin");
                  return (
                    <div key={String(message.id || message._id || index)} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 shadow-sm ${mine ? "bg-indigo-600 text-white rounded-br-md" : "bg-white text-slate-800 border border-slate-200 rounded-bl-md"}`}>
                        <p className="whitespace-pre-wrap break-words text-sm leading-5">{message.body}</p>
                        <p className={`mt-1 text-[10px] ${mine ? "text-indigo-100" : "text-slate-400"}`}>
                          {message.createdAt ? new Date(message.createdAt).toLocaleString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={sendMessage} className="border-t border-slate-200 p-3 flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Message ${selected.name}...`}
                  maxLength={4000}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                <button type="submit" disabled={!draft.trim() || sending} className="rounded-xl bg-indigo-600 px-4 text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-indigo-700 transition">
                  <Send size={19} />
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
