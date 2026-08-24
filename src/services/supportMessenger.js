import { apiRequest } from "../lib/api.js";

export const supportMessengerService = {
  getConversations: () => apiRequest("/support-messages/admin/conversations"),
  getUsers: (q = "") => apiRequest(`/support-messages/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  createConversation: (userId, role) => apiRequest("/support-messages/admin/conversations", { method: "POST", body: { userId, role } }),
  getMessages: (conversationId) => apiRequest(`/support-messages/admin/conversations/${conversationId}`),
  sendMessage: (conversationId, text) => apiRequest(`/support-messages/admin/conversations/${conversationId}/messages`, { method: "POST", body: { text } }),
  markRead: (conversationId) => apiRequest(`/support-messages/admin/conversations/${conversationId}/read`, { method: "PATCH", body: {} }),
};
