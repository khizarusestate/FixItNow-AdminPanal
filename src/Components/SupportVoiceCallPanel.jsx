import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, Volume2 } from "lucide-react";

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];
const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));
const durationText = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

export default function SupportVoiceCallPanel() {
  const [call, setCall] = useState(null);
  const [status, setStatus] = useState("idle");
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const [duration, setDuration] = useState(0);
  const callRef = useRef(null);
  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const pendingIceRef = useRef([]);
  const timeoutRef = useRef(null);
  const timerRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    timeoutRef.current = null;
    timerRef.current = null;
  }, []);

  const cleanup = useCallback((notify = false) => {
    const current = callRef.current;
    clearTimers();
    if (notify && current?.bookingId && current?.targetUserId) {
      emit("fixitnow-admin-voice-call-end-send", {
        bookingId: current.bookingId,
        targetUserId: current.targetUserId,
        callId: current.callId,
      });
    }
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    pendingIceRef.current = [];
    callRef.current = null;
    setCall(null);
    setStatus("idle");
    setMuted(false);
    setDuration(0);
    setError("");
  }, [clearTimers]);

  const armTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setError("The call could not connect. Check microphone permission and the user's connection.");
      setTimeout(() => cleanup(true), 1800);
    }, 30000);
  }, [cleanup]);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    setDuration(0);
    timerRef.current = setInterval(() => setDuration((value) => value + 1), 1000);
  }, []);

  const getMicrophone = useCallback(async (pc) => {
    if (streamRef.current) return streamRef.current;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone calls require HTTPS and browser microphone support.");
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      video: false,
    });
    streamRef.current = stream;
    stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));
    return stream;
  }, []);

  const flushIce = useCallback(async (pc) => {
    const candidates = pendingIceRef.current.splice(0);
    for (const candidate of candidates) {
      try { await pc.addIceCandidate(candidate); } catch { /* stale candidate */ }
    }
  }, []);

  const createPeer = useCallback(async (current) => {
    pcRef.current?.close();
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;
    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      emit("fixitnow-admin-voice-call-signal-send", {
        bookingId: current.bookingId,
        targetUserId: current.targetUserId,
        callId: current.callId,
        signal: { type: "ice-candidate", candidate: event.candidate.toJSON() },
      });
    };
    pc.ontrack = (event) => {
      const stream = event.streams?.[0];
      if (!audioRef.current || !stream) return;
      audioRef.current.srcObject = stream;
      audioRef.current.volume = 1;
      audioRef.current.play().catch(() => {});
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        clearTimers();
        setStatus("connected");
        startTimer();
      } else if (["failed", "closed"].includes(pc.connectionState)) {
        setError("Voice connection was lost.");
        setTimeout(() => cleanup(false), 900);
      }
    };
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed") setError("Network negotiation failed. A TURN server may be required on restrictive networks.");
    };
    return pc;
  }, [cleanup, clearTimers, startTimer]);

  const startOutgoing = useCallback(async (detail) => {
    try {
      const pc = await createPeer(detail);
      await getMicrophone(pc);
      setStatus("calling");
      armTimeout();
      emit("fixitnow-admin-voice-call-start-send", {
        bookingId: detail.bookingId,
        targetUserId: detail.targetUserId,
        callId: detail.callId,
        participantName: detail.participantName,
      });
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      emit("fixitnow-admin-voice-call-signal-send", {
        bookingId: detail.bookingId,
        targetUserId: detail.targetUserId,
        callId: detail.callId,
        signal: { type: "offer", sdp: offer },
      });
    } catch (err) {
      setError(err?.name === "NotAllowedError" ? "Microphone permission was denied." : err?.message || "Could not start the call.");
      setTimeout(() => cleanup(false), 1800);
    }
  }, [armTimeout, cleanup, createPeer, getMicrophone]);

  useEffect(() => {
    const onStart = (event) => {
      const detail = event.detail || {};
      if (!detail.bookingId || !detail.targetUserId || callRef.current) return;
      const next = {
        ...detail,
        callId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
        targetUserId: String(detail.targetUserId),
      };
      callRef.current = next;
      setCall(next);
      setStatus("calling");
      void startOutgoing(next);
    };
    const onSignal = async (event) => {
      const data = event.detail || {};
      const current = callRef.current;
      if (!current || data.callId !== current.callId || !data.signal) return;
      try {
        if (data.signal.type === "ice-candidate") {
          if (!pcRef.current?.remoteDescription) pendingIceRef.current.push(data.signal.candidate);
          else await pcRef.current.addIceCandidate(data.signal.candidate);
          return;
        }
        if (data.signal.type === "answer") {
          const pc = pcRef.current;
          if (!pc || pc.signalingState !== "have-local-offer") return;
          await pc.setRemoteDescription(data.signal.sdp);
          await flushIce(pc);
          setStatus("connecting");
          armTimeout();
        }
      } catch (err) {
        setError(err?.message || "Voice connection negotiation failed.");
      }
    };
    const onEnded = (event) => {
      const data = event.detail || {};
      if (callRef.current && (!data.callId || data.callId === callRef.current.callId)) cleanup(false);
    };
    const onError = (event) => {
      setError(event.detail?.message || "Voice call failed.");
      setTimeout(() => cleanup(false), 1500);
    };

    window.addEventListener("fixitnow-admin-start-voice-call", onStart);
    window.addEventListener("fixitnow-admin-voice-call-signal", onSignal);
    window.addEventListener("fixitnow-admin-voice-call-ended", onEnded);
    window.addEventListener("fixitnow-admin-voice-call-error", onError);
    return () => {
      window.removeEventListener("fixitnow-admin-start-voice-call", onStart);
      window.removeEventListener("fixitnow-admin-voice-call-signal", onSignal);
      window.removeEventListener("fixitnow-admin-voice-call-ended", onEnded);
      window.removeEventListener("fixitnow-admin-voice-call-error", onError);
      cleanup(false);
    };
  }, [armTimeout, cleanup, flushIce, startOutgoing]);

  const toggleMute = () => {
    const track = streamRef.current?.getAudioTracks?.()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  };

  if (!call) return <audio ref={audioRef} autoPlay playsInline className="hidden" />;
  const connected = status === "connected";
  const name = call.participantName || "User";
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <>
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md">
        <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/15 bg-gradient-to-b from-slate-900 via-slate-950 to-black px-6 py-8 text-white shadow-2xl">
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-blue-500/20 to-transparent" />
          <div className="relative text-center">
            <div className="mb-8 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50"><span>FixItNow Voice</span><span className="flex items-center gap-1.5 normal-case tracking-normal"><span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "animate-pulse bg-blue-400"}`} />{connected ? "Connected" : status === "calling" ? "Calling" : "Connecting"}</span></div>
            <div className="relative mx-auto mb-5 flex h-28 w-28 items-center justify-center"><div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-blue-400 to-blue-600 text-2xl font-bold shadow-[0_0_45px_rgba(59,130,246,0.25)]">{initials || <Phone size={28} />}</div></div>
            <h3 className="text-2xl font-bold tracking-tight">{name}</h3>
            <p className="mt-1 text-sm text-white/50">{connected ? durationText(duration) : status === "calling" ? "Calling…" : "Connecting…"}</p>
            {error ? <div className="mx-auto mt-5 rounded-2xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-xs leading-5 text-red-200">{error}</div> : <div className="mt-6 flex items-center justify-center gap-2 text-xs text-white/35"><Volume2 size={14} /> Voice only · No camera</div>}
            <div className="mt-8 flex items-center justify-center gap-4">
              {connected && <button type="button" onClick={toggleMute} className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/10 transition hover:bg-white/15" aria-label={muted ? "Unmute microphone" : "Mute microphone"}>{muted ? <MicOff size={21} /> : <Mic size={21} />}</button>}
              <button type="button" onClick={() => cleanup(true)} className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:bg-red-600" aria-label="End call"><PhoneOff size={21} /></button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
