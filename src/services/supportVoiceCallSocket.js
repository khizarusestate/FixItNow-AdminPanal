import { io } from "socket.io-client";
import { SOCKET_URL } from "../config/env.js";
import { getToken } from "../lib/api";

let socket = null;
let cleanup = null;

const dispatch = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

export function startSupportVoiceCallSocket() {
  stopSupportVoiceCallSocket();
  if (!SOCKET_URL) return () => {};

  socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    withCredentials: true,
    auth: { token: getToken() || "" },
  });

  const join = () => {
    const token = getToken();
    if (token) socket?.emit("join-admin", token);
  };

  const onConnect = () => join();
  const onIncomingSignal = (data) => dispatch("fixitnow-admin-voice-call-signal", data);
  const onEnded = (data) => dispatch("fixitnow-admin-voice-call-ended", data);
  const onError = (data) => dispatch("fixitnow-admin-voice-call-error", data);

  const onStartSend = (event) => {
    const detail = event.detail || {};
    if (!detail.bookingId || !detail.targetUserId || !detail.callId) return;
    socket?.emit("voice-call-start", detail);
  };
  const onSignalSend = (event) => {
    const detail = event.detail || {};
    if (!detail.bookingId || !detail.targetUserId || !detail.callId || !detail.signal) return;
    socket?.emit("voice-call-signal", detail);
  };
  const onEndSend = (event) => {
    const detail = event.detail || {};
    if (!detail.bookingId || !detail.targetUserId || !detail.callId) return;
    socket?.emit("voice-call-end", detail);
  };

  socket.on("connect", onConnect);
  socket.on("voice-call-signal", onIncomingSignal);
  socket.on("voice-call-ended", onEnded);
  socket.on("voice-call-error", onError);
  window.addEventListener("fixitnow-admin-voice-call-start-send", onStartSend);
  window.addEventListener("fixitnow-admin-voice-call-signal-send", onSignalSend);
  window.addEventListener("fixitnow-admin-voice-call-end-send", onEndSend);

  cleanup = () => {
    window.removeEventListener("fixitnow-admin-voice-call-start-send", onStartSend);
    window.removeEventListener("fixitnow-admin-voice-call-signal-send", onSignalSend);
    window.removeEventListener("fixitnow-admin-voice-call-end-send", onEndSend);
    socket?.off("connect", onConnect);
    socket?.off("voice-call-signal", onIncomingSignal);
    socket?.off("voice-call-ended", onEnded);
    socket?.off("voice-call-error", onError);
    socket?.disconnect();
    socket = null;
    cleanup = null;
  };

  return cleanup;
}

export function stopSupportVoiceCallSocket() {
  cleanup?.();
}
