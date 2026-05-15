"use client";

import { useEffect, useRef, useState } from "react";

import { SignOutButton } from "./sign-out-button";

type ChatHomeProps = {
  planName: string;
  dailyMessageLimit: number;
  messagesUsedToday: number;
  messagesRemaining: number;
  messagesResetAtLabel: string;
};

type ChatState =
  | "idle"
  | "joining"
  | "searching"
  | "matched"
  | "disconnected"
  | "error";

type ChatMessage = {
  id: string;
  sender: "peer" | "self" | "system";
  text: string;
  timestamp: string;
};

type ServerMessage =
  | {
      type: "error";
      message: string;
    }
  | {
      type: "idle";
    }
  | {
      type: "matched";
      peerPublicKey: string;
      roomId: string;
    }
  | {
      type: "message";
      ciphertext: string;
      iv: string;
    }
  | {
      type: "peer-left";
    }
  | {
      type: "searching";
    };

function buildTimestamp() {
  return new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function bytesToBase64(bytes: Uint8Array) {
  let value = "";

  for (const byte of bytes) {
    value += String.fromCharCode(byte);
  }

  return btoa(value);
}

function base64ToBytes(value: string) {
  const decoded = atob(value);
  const bytes = new Uint8Array(decoded.length);

  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }

  return bytes;
}

async function createKeyPair() {
  return window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey"],
  );
}

async function exportPublicKey(publicKey: CryptoKey) {
  const exportedKey = await window.crypto.subtle.exportKey("raw", publicKey);
  return bytesToBase64(new Uint8Array(exportedKey));
}

async function importPeerPublicKey(publicKey: string) {
  return window.crypto.subtle.importKey(
    "raw",
    base64ToBytes(publicKey),
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    [],
  );
}

async function deriveSharedKey(
  privateKey: CryptoKey,
  peerPublicKey: CryptoKey,
) {
  return window.crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: peerPublicKey,
    },
    privateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["decrypt", "encrypt"],
  );
}

async function encryptMessage(sharedKey: CryptoKey, plaintext: string) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedMessage = new TextEncoder().encode(plaintext);
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    sharedKey,
    encodedMessage,
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
  };
}

async function decryptMessage(
  sharedKey: CryptoKey,
  ciphertext: string,
  iv: string,
) {
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64ToBytes(iv),
    },
    sharedKey,
    base64ToBytes(ciphertext),
  );

  return new TextDecoder().decode(decrypted);
}

export function ChatHome({
  planName,
  dailyMessageLimit,
  messagesUsedToday,
  messagesRemaining,
  messagesResetAtLabel,
}: ChatHomeProps) {
  const [chatState, setChatState] = useState<ChatState>("idle");
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quota, setQuota] = useState({
    dailyMessageLimit,
    messagesRemaining,
    messagesUsedToday,
  });
  const [statusText, setStatusText] = useState(
    "Join anonymously to be matched with a random person who is online now.",
  );
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const keyPairRef = useRef<CryptoKeyPair | null>(null);
  const sharedKeyRef = useRef<CryptoKey | null>(null);
  const leavingRef = useRef(false);

  useEffect(() => {
    const transcript = transcriptRef.current;

    if (!transcript) {
      return;
    }

    transcript.scrollTop = transcript.scrollHeight;
  }, [messages, statusText]);

  useEffect(() => {
    return () => {
      leavingRef.current = true;
      websocketRef.current?.close();
    };
  }, []);

  const appendMessage = (sender: ChatMessage["sender"], text: string) => {
    setMessages((current) => [
      ...current,
      {
        id: window.crypto.randomUUID(),
        sender,
        text,
        timestamp: buildTimestamp(),
      },
    ]);
  };

  const resetConnection = () => {
    sharedKeyRef.current = null;
    keyPairRef.current = null;
    websocketRef.current?.close();
    websocketRef.current = null;
  };

  const handleServerMessage = async (message: ServerMessage) => {
    if (message.type === "searching") {
      setChatState("searching");
      setStatusText("Searching for a random anonymous partner...");
      setMessages([]);
      appendMessage(
        "system",
        "You are in the matchmaking queue. Messaging unlocks only after the encryption handshake completes.",
      );
      return;
    }

    if (message.type === "matched") {
      const keyPair = keyPairRef.current;

      if (!keyPair) {
        setChatState("error");
        setStatusText("Key exchange failed before the room was established.");
        appendMessage(
          "system",
          "The anonymous room could not finish the encryption handshake.",
        );
        return;
      }

      const peerPublicKey = await importPeerPublicKey(message.peerPublicKey);
      sharedKeyRef.current = await deriveSharedKey(
        keyPair.privateKey,
        peerPublicKey,
      );
      setChatState("matched");
      setStatusText(
        "Matched. Messages are relayed over websocket and decrypted only in each browser.",
      );
      setMessages([]);
      appendMessage(
        "system",
        "Anonymous room established. End-to-end encryption is active and the server only sees ciphertext.",
      );
      return;
    }

    if (message.type === "message") {
      const sharedKey = sharedKeyRef.current;

      if (!sharedKey) {
        return;
      }

      try {
        const plaintext = await decryptMessage(
          sharedKey,
          message.ciphertext,
          message.iv,
        );
        appendMessage("peer", plaintext);
      } catch {
        appendMessage(
          "system",
          "An incoming message could not be decrypted with the current session key.",
        );
      }

      return;
    }

    if (message.type === "peer-left") {
      sharedKeyRef.current = null;
      setChatState("disconnected");
      setStatusText(
        "The other person left. Join again to get a new random match.",
      );
      appendMessage(
        "system",
        "Your anonymous peer disconnected. No transcript was saved.",
      );
      return;
    }

    if (message.type === "idle") {
      sharedKeyRef.current = null;
      setChatState("idle");
      setStatusText(
        "Join anonymously to be matched with a random person who is online now.",
      );
      setMessages([]);
      return;
    }

    setChatState("error");
    setStatusText(message.message);
    appendMessage("system", message.message);
  };

  const handleJoin = async () => {
    try {
      leavingRef.current = false;
      resetConnection();
      setMessages([]);
      setDraft("");
      setChatState("joining");
      setStatusText(
        "Opening websocket and preparing an end-to-end encrypted room...",
      );

      const ticketResponse = await fetch("/api/chat/socket-ticket", {
        method: "POST",
      });

      const ticketPayload = (await ticketResponse.json()) as
        | {
            message?: string;
            ticket?: string;
          }
        | undefined;

      if (!ticketResponse.ok || !ticketPayload?.ticket) {
        throw new Error(
          ticketPayload?.message ?? "Could not create a websocket ticket.",
        );
      }

      const keyPair = await createKeyPair();
      keyPairRef.current = keyPair;
      const publicKey = await exportPublicKey(keyPair.publicKey);
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

      websocketRef.current = socket;

      socket.addEventListener("open", () => {
        socket.send(
          JSON.stringify({
            publicKey,
            ticket: ticketPayload.ticket,
            type: "join",
          }),
        );
      });

      socket.addEventListener("message", (event) => {
        const payload = JSON.parse(event.data) as ServerMessage;
        void handleServerMessage(payload);
      });

      socket.addEventListener("close", () => {
        websocketRef.current = null;
        sharedKeyRef.current = null;

        if (leavingRef.current) {
          return;
        }

        setChatState("disconnected");
        setStatusText(
          "The websocket closed. Join again to find another anonymous partner.",
        );
      });

      socket.addEventListener("error", () => {
        setChatState("error");
        setStatusText("The websocket connection failed.");
      });
    } catch (error) {
      resetConnection();
      setChatState("error");
      setStatusText(
        error instanceof Error
          ? error.message
          : "Anonymous join failed to start.",
      );
    }
  };

  const handleLeave = () => {
    leavingRef.current = true;

    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(
        JSON.stringify({
          type: "leave",
        }),
      );
    }

    resetConnection();
    setChatState("idle");
    setStatusText(
      "Join anonymously to be matched with a random person who is online now.",
    );
    setMessages([]);
    setDraft("");
  };

  const handleSend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const websocket = websocketRef.current;
    const sharedKey = sharedKeyRef.current;
    const message = draft.trim();

    if (
      !message ||
      !sharedKey ||
      !websocket ||
      websocket.readyState !== WebSocket.OPEN ||
      chatState !== "matched"
    ) {
      return;
    }

    setIsSending(true);

    try {
      const encryptedMessage = await encryptMessage(sharedKey, message);
      const quotaResponse = await fetch("/api/chat/messages", {
        method: "POST",
      });
      const quotaPayload = (await quotaResponse.json()) as
        | {
            dailyMessageLimit?: number;
            message?: string;
            messagesRemaining?: number;
            messagesUsedToday?: number;
          }
        | undefined;

      if (
        typeof quotaPayload?.dailyMessageLimit === "number" &&
        typeof quotaPayload?.messagesRemaining === "number" &&
        typeof quotaPayload?.messagesUsedToday === "number"
      ) {
        setQuota({
          dailyMessageLimit: quotaPayload.dailyMessageLimit,
          messagesRemaining: quotaPayload.messagesRemaining,
          messagesUsedToday: quotaPayload.messagesUsedToday,
        });
      }

      if (!quotaResponse.ok) {
        appendMessage(
          "system",
          quotaPayload?.message ?? "This message could not be sent.",
        );
        return;
      }

      websocket.send(
        JSON.stringify({
          ciphertext: encryptedMessage.ciphertext,
          iv: encryptedMessage.iv,
          type: "message",
        }),
      );

      appendMessage("self", message);
      setDraft("");
    } catch {
      appendMessage(
        "system",
        "This message could not be encrypted and was not sent.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const isInChatWindow = chatState !== "idle";
  const canSend =
    chatState === "matched" && !isSending && quota.messagesRemaining > 0;

  return (
    <div className="mx-auto flex flex-col gap-8 w-full">
      <header className="rounded-[1.75rem] border border-[#d4af37]/16 bg-[#0d0b08] p-8 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-4xl flex font-medium tracking-[-0.05em] text-[#f8edd0]">
              Private<p className="text-[#d4af37]">Social</p>
            </h1>
            <p className="mt-3 text-sm leading-7 text-[#f6e7bf]/62">
              Match with a random person who is online, no strings attached.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/*<span className="rounded-full border border-[#d4af37]/16 bg-black/25 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#f6e7bf]/62">
              {chatState === "matched"
                ? "Anonymous link active"
                : chatState === "searching" || chatState === "joining"
                  ? "Searching for match"
                  : "Waiting to join"}
            </span>*/}
            <SignOutButton />
          </div>
        </div>
      </header>

      <section className="">
        <div className="overflow-hidden rounded-[2rem] border border-[#d4af37]/14 bg-[#0b0907] shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
          {!isInChatWindow ? (
            <div className="relative flex min-h-[640px] flex-col items-center justify-center overflow-hidden px-8 py-12 text-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(212,175,55,0.08),_transparent_32%),linear-gradient(180deg,_rgba(10,8,6,0.6),_rgba(7,6,5,0.96))]" />
              <div className="absolute left-10 top-10 h-28 w-28 rounded-full border border-[#d4af37]/12" />
              <div className="absolute bottom-10 right-10 h-40 w-40 rounded-full border border-[#d4af37]/10" />

              <div className="relative z-10 flex flex-col">
                {/*<p className="text-xs uppercase tracking-[0.34em] text-[#d4af37]/72">
                  Private Social
                </p>*/}
                {/*<h2 className="mt-5 text-5xl font-medium tracking-[-0.08em] text-[#f8edd0] sm:text-6xl">
                  Join anonymously
                </h2>*/}
                {/*<p className="mx-auto mt-5 text-sm leading-7 text-[#f6e7bf]/62">
                  When you join, the client opens a websocket, waits in a live
                  random queue, and only starts messaging after an end-to-end
                  encrypted room is created with another active visitor.
                </p>*/}

                <button
                  type="button"
                  onClick={handleJoin}
                  className="inline-flex mb-4 min-h-24 items-center justify-center rounded-[1.75rem] bg-[#d4af37] px-10 text-2xl font-semibold tracking-[-0.04em] text-black shadow-[0_20px_60px_rgba(212,175,55,0.28)] transition hover:scale-[1.01] hover:bg-[#e2c15a]"
                >
                  Join Anonymously
                </button>
                <span className="mb-1 rounded-full border border-[#d4af37]/12 px-3 py-2">
                  {quota.messagesRemaining} texts left today
                </span>
                <p className="text-sm  text-[#f6e7bf]/42">
                  Resets {messagesResetAtLabel}
                </p>
                {/*<div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs uppercase tracking-[0.22em] text-[#f6e7bf]/48">
                  <span className="rounded-full border border-[#d4af37]/12 px-3 py-2">
                    {planName}
                  </span>
                  <span className="rounded-full border border-[#d4af37]/12 px-3 py-2">
                    {quota.messagesRemaining} texts left
                  </span>
                  <span className="rounded-full border border-[#d4af37]/12 px-3 py-2">
                    websocket relay
                  </span>
                  <span className="rounded-full border border-[#d4af37]/12 px-3 py-2">
                    no stored transcripts
                  </span>
                </div>
                <p className="mt-4 text-xs uppercase tracking-[0.22em] text-[#f6e7bf]/42">
                  {quota.messagesUsedToday}/{quota.dailyMessageLimit} used
                  today • resets {messagesResetAtLabel}
                </p>*/}
              </div>
            </div>
          ) : (
            <div className="grid h-[70vh] min-h-[640px] max-h-[760px] grid-rows-[auto_1fr_auto]">
              <div className="border-b border-[#d4af37]/12 bg-[#120f0c] px-6 py-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    {/*<p className="text-xs uppercase tracking-[0.28em] text-[#d4af37]/72">
                      Anonymous room
                    </p>*/}
                    <h2 className="mt-2 text-2xl font-medium tracking-[-0.05em] text-[#f8edd0]">
                      {chatState === "matched"
                        ? "Matched with a random active user"
                        : "Waiting for a random active user"}
                    </h2>
                    <p className="mt-2 text-sm text-[#f6e7bf]/58">
                      {quota.messagesRemaining} texts left on {planName}. Resets{" "}
                      {messagesResetAtLabel}.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {/*<span className="rounded-full border border-[#d4af37]/18 bg-black/24 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#f6e7bf]/68">
                      {chatState}
                    </span>*/}
                    <button
                      type="button"
                      onClick={
                        chatState === "matched" ? handleLeave : handleJoin
                      }
                      className="rounded-full border border-[#d4af37]/20 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#f6e7bf] transition hover:border-[#d4af37]/38 hover:bg-black/30"
                    >
                      {chatState === "matched"
                        ? "Leave room"
                        : "Find new match"}
                    </button>
                  </div>
                </div>
              </div>

              <div
                ref={transcriptRef}
                className="flex flex-col gap-4 overflow-y-auto bg-[linear-gradient(180deg,_rgba(15,12,9,0.92),_rgba(8,7,5,0.96))] px-5 py-6 sm:px-6"
              >
                {messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="max-w-md rounded-[1.5rem] border border-[#d4af37]/12 bg-[#17130f] px-5 py-4 text-center text-sm leading-7 text-[#f6e7bf]/62">
                      Your messages are end-to-end encrypted and not saved
                      anywhere. Feel free to pour your wildest imaginations out.
                    </div>
                  </div>
                ) : null}

                {messages.map((message) => {
                  const isSelf = message.sender === "self";
                  const isSystem = message.sender === "system";

                  return (
                    <article
                      key={message.id}
                      className={`flex ${
                        isSystem
                          ? "justify-center"
                          : isSelf
                            ? "justify-end"
                            : "justify-start"
                      }`}
                    >
                      <div
                        className={` rounded-[1.5rem] px-4 py-3 ${
                          isSystem
                            ? "border border-[#d4af37]/10 bg-[#15110d] text-[#f6e7bf]/70"
                            : isSelf
                              ? "bg-[#d4af37] text-black"
                              : "border border-[#d4af37]/12 bg-[#17130f] text-[#f6e7bf]"
                        }`}
                      >
                        <p className="text-xs uppercase tracking-[0.2em] opacity-60">
                          {isSystem ? "System" : isSelf ? "You" : "Peer"}
                        </p>
                        <p className="mt-2 text-sm leading-7">{message.text}</p>
                        <p className="mt-3 text-[11px] uppercase tracking-[0.16em] opacity-50">
                          {message.timestamp}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>

              <form
                onSubmit={handleSend}
                className="border-t border-[#d4af37]/12 bg-[#120f0c] px-5 py-5 sm:px-6"
              >
                <div className="flex flex-col gap-3 sm:flex-row">
                  <label className="sr-only" htmlFor="message-input">
                    Type your message
                  </label>
                  <input
                    id="message-input"
                    type="text"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={
                      chatState === "matched"
                        ? quota.messagesRemaining > 0
                          ? "Send an end-to-end encrypted message..."
                          : "Your daily message limit has been reached..."
                        : "Messaging unlocks when a random partner is matched..."
                    }
                    disabled={!canSend}
                    className="min-h-14 flex-1 rounded-[1.3rem] border border-[#d4af37]/16 bg-black/28 px-5 text-sm text-[#f8edd0] outline-none transition placeholder:text-[#f6e7bf]/28 focus:border-[#d4af37]/45 focus:bg-black/36 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || !canSend}
                    className="min-h-14 rounded-[1.3rem] bg-[#d4af37] px-6 text-sm font-medium text-black transition hover:bg-[#e2c15a] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSending ? "Encrypting..." : "Send message"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
