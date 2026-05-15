import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";

import nextEnv from "@next/env";
import next from "next";
import { WebSocketServer } from "ws";

const dev = process.argv[2] !== "start";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);
const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd(), dev);

const chatSecret = process.env.CHAT_TICKET_SECRET ?? process.env.BETTER_AUTH_SECRET;

if (!chatSecret) {
  throw new Error("CHAT_TICKET_SECRET or BETTER_AUTH_SECRET must be set.");
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(`${normalized}${"=".repeat(padding)}`, "base64");
}

function signTicketPayload(payload) {
  return createHmac("sha256", chatSecret).update(payload).digest("base64url");
}

function verifyTicket(ticket) {
  const [payload, signature] = ticket.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signTicketPayload(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload).toString("utf8"));

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.sub !== "string" ||
      typeof parsed.exp !== "number" ||
      parsed.exp < Date.now()
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function sendJson(socket, payload) {
  if (socket.readyState !== socket.OPEN) {
    return;
  }

  socket.send(JSON.stringify(payload));
}

function createClientState(socket) {
  return {
    partner: null,
    publicKey: null,
    roomId: null,
    searching: false,
    socket,
    userId: null,
  };
}

const waitingClients = [];

function removeFromWaitingQueue(state) {
  const index = waitingClients.indexOf(state);

  if (index >= 0) {
    waitingClients.splice(index, 1);
  }

  state.searching = false;
}

function clearPartnerLink(state, notifyPeer) {
  const partner = state.partner;
  state.partner = null;
  state.roomId = null;
  state.publicKey = null;
  state.searching = false;

  if (!partner) {
    return;
  }

  partner.partner = null;
  partner.roomId = null;
  partner.publicKey = null;
  partner.searching = false;

  if (notifyPeer) {
    sendJson(partner.socket, {
      type: "peer-left",
    });
  }
}

function resetClientState(state, notifyPeer) {
  removeFromWaitingQueue(state);
  clearPartnerLink(state, notifyPeer);
  state.userId = null;
}

function pairClients(first, second) {
  removeFromWaitingQueue(first);
  removeFromWaitingQueue(second);

  const roomId = randomUUID();
  first.partner = second;
  second.partner = first;
  first.roomId = roomId;
  second.roomId = roomId;
  first.searching = false;
  second.searching = false;

  sendJson(first.socket, {
    type: "matched",
    peerPublicKey: second.publicKey,
    roomId,
  });
  sendJson(second.socket, {
    type: "matched",
    peerPublicKey: first.publicKey,
    roomId,
  });
}

const app = next({
  dev,
  hostname,
  port,
});

const handle = app.getRequestHandler();

app.prepare().then(() => {
  const upgradeHandler = app.getUpgradeHandler();
  const websocketServer = new WebSocketServer({
    noServer: true,
  });

  websocketServer.on("connection", (socket) => {
    const state = createClientState(socket);

    socket.on("message", (rawMessage) => {
      try {
        const parsedMessage = JSON.parse(rawMessage.toString());

        if (parsedMessage?.type === "join") {
          const ticket = typeof parsedMessage.ticket === "string" ? parsedMessage.ticket : "";
          const publicKey =
            typeof parsedMessage.publicKey === "string" ? parsedMessage.publicKey : "";
          const session = verifyTicket(ticket);

          if (!session || !publicKey) {
            sendJson(socket, {
              type: "error",
              message: "Anonymous join failed.",
            });
            return;
          }

          resetClientState(state, false);
          state.userId = session.sub;
          state.publicKey = publicKey;

          const match = waitingClients.find(
            (candidate) =>
              candidate !== state &&
              candidate.userId &&
              candidate.userId !== state.userId &&
              candidate.publicKey &&
              candidate.socket.readyState === candidate.socket.OPEN,
          );

          if (match) {
            pairClients(match, state);
            return;
          }

          state.searching = true;
          waitingClients.push(state);
          sendJson(socket, {
            type: "searching",
          });
          return;
        }

        if (parsedMessage?.type === "leave") {
          resetClientState(state, true);
          sendJson(socket, {
            type: "idle",
          });
          return;
        }

        if (parsedMessage?.type === "message") {
          if (!state.partner) {
            sendJson(socket, {
              type: "error",
              message: "No anonymous peer is connected right now.",
            });
            return;
          }

          const iv = typeof parsedMessage.iv === "string" ? parsedMessage.iv : "";
          const ciphertext =
            typeof parsedMessage.ciphertext === "string" ? parsedMessage.ciphertext : "";

          if (!iv || !ciphertext) {
            sendJson(socket, {
              type: "error",
              message: "Encrypted message payload is invalid.",
            });
            return;
          }

          sendJson(state.partner.socket, {
            type: "message",
            ciphertext,
            iv,
          });
        }
      } catch {
        sendJson(socket, {
          type: "error",
          message: "Malformed websocket message.",
        });
      }
    });

    socket.on("close", () => {
      resetClientState(state, true);
    });

    socket.on("error", () => {
      resetClientState(state, true);
    });
  });

  const server = createServer((req, res) => {
    handle(req, res);
  });

  server.on("upgrade", (req, socket, head) => {
    if (req.url?.startsWith("/ws")) {
      websocketServer.handleUpgrade(req, socket, head, (websocket) => {
        websocketServer.emit("connection", websocket, req);
      });
      return;
    }

    upgradeHandler(req, socket, head);
  });

  server.listen(port, hostname, () => {
    console.log(
      `> Ready on http://${hostname}:${port} (${dev ? "development" : "production"})`,
    );
  });
});
