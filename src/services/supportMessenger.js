import { apiRequest } from "../lib/api.js";

export const supportMessengerService = {
  list: () => apiRequest("/messages/support/mine"),
  getMessages: (conversationId) => apiRequest(`/messages/support/${conversationId}`),
  sendMessage: (conversationId, text) => apiRequest(`/messages/support/${conversationId}`, { method: "POST", body: JSON.stringify({ text }) }),
  markRead: (conversationId) => apiRequest(`/messages/support/${conversationId}/read`, { method: "PATCH", body: JSON.stringify({}) }),
};
