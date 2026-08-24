import { apiRequestWithAuth } from "./api.js";

export const supportMessengerService = {
  list: () => apiRequestWithAuth("/messages/support/mine", { role: "admin" }),
  getMessages: (conversationId) => apiRequestWithAuth(`/messages/support/${conversationId}`, { role: "admin" }),
  sendMessage: (conversationId, text) => apiRequestWithAuth(`/messages/support/${conversationId}`, { role: "admin", method: "POST", body: { text } }),
  markRead: (conversationId) => apiRequestWithAuth(`/messages/support/${conversationId}/read`, { role: "admin", method: "PATCH", body: {} }),
};
