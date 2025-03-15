import { client } from "@repo/db/client";
import http from "http";
import jwt from "jsonwebtoken";
import { parse } from "url";
import WebSocket, { WebSocketServer } from "ws";

// Environment variables should be imported from a shared package
const JWT_SECRET = "iamthepapaofmybabaiesuiwsdcverfghbnthjnmpoiuhytgfrsdcvb";

// Types for messages
interface BaseMessage {
  type: string;
  [key: string]: any;
}

// User data attached to WebSocket connection
interface SocketData {
  userId: string;
  username: string;
  role: string;
  rooms: Set<string>;
}

type SocketWithData = WebSocket & { data?: SocketData };

export function createWebSocketServer(httpServer: http.Server) {
  // Create WebSocket server
  const wss = new WebSocketServer({ noServer: true });

  // Store active connections by userId
  const clients = new Map<string, SocketWithData>();

  // Store room memberships
  const rooms = new Map<string, Set<SocketWithData>>();

  // Join a room
  function joinRoom(socket: SocketWithData, roomId: string) {
    if (!socket.data) return;

    let room = rooms.get(roomId);
    if (!room) {
      room = new Set();
      rooms.set(roomId, room);
    }

    room.add(socket);
    socket.data.rooms.add(roomId);
  }

  // Leave a room
  function leaveRoom(socket: SocketWithData, roomId: string) {
    if (!socket.data) return;

    const room = rooms.get(roomId);
    if (room) {
      room.delete(socket);
      if (room.size === 0) {
        rooms.delete(roomId);
      }
    }

    socket.data.rooms.delete(roomId);
  }

  // Send to all clients in a room except sender
  function broadcastToRoom(
    roomId: string,
    message: any,
    exclude?: SocketWithData,
  ) {
    const room = rooms.get(roomId);
    if (!room) return;

    const messageStr = JSON.stringify(message);

    room.forEach((client) => {
      if (client !== exclude && client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  // Send to specific user by userId
  function sendToUser(userId: string, message: any) {
    const client = clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  // Handle upgrade requests for WebSocket
  httpServer.on("upgrade", async (request, socket, head) => {
    const { pathname, query } = parse(request.url || "", true);

    if (pathname !== "/ws") {
      console.log("Invalid WebSocket path:", pathname);
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.destroy();
      return;
    }

    const token = query.token as string;
    if (!token) {
      console.log("Missing token in WebSocket connection attempt");
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    try {
      console.log("Attempting to verify token for WebSocket connection");
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & {
        id: string;
      };

      if (!decoded || !decoded.id) {
        console.log("Invalid token payload in WebSocket connection");
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      const user = await client.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user || !user.isActive) {
        console.log("User not found or inactive:", decoded.id);
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      console.log("User authenticated successfully:", user.username);
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request, user);
      });
    } catch (error) {
      console.error("WebSocket authentication error:", error);
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    }
  });

  // Handle connections
  wss.on("connection", async (ws: SocketWithData, request, user) => {
    console.log(`User connected: ${user.username} (${user.id})`);

    // Update user's last online status
    await client.user.update({
      where: { id: user.id },
      data: { lastOnline: new Date() },
    });

    // Attach user data to the WebSocket instance
    ws.data = {
      userId: user.id,
      username: user.username,
      role: user.role,
      rooms: new Set(),
    };

    // Store the connection
    clients.set(user.id, ws);

    // Add user to their own room for direct messages
    joinRoom(ws, `user:${user.id}`);

    // Handle messages
    ws.on("message", async (messageStr) => {
      try {
        const message = JSON.parse(messageStr.toString()) as BaseMessage;

        // Handle different message types
        switch (message.type) {
          case "joinSpace":
            await handleJoinSpace(ws, message);
            break;

          case "leaveSpace":
            await handleLeaveSpace(ws, message);
            break;

          case "updatePosition":
            await handleUpdatePosition(ws, message);
            break;

          case "sendChatMessage":
            await handleSendChatMessage(ws, message);
            break;

          case "updateStatus":
            await handleUpdateStatus(ws, message);
            break;

          default:
            sendError(ws, `Unknown message type: ${message.type}`);
        }
      } catch (error) {
        console.error("Error handling message:", error);
        sendError(ws, "Failed to process message");
      }
    });

    // Handle disconnection
    ws.on("close", async () => {
      await handleDisconnect(ws);
    });
  });

  // Handler for joining a space
  async function handleJoinSpace(ws: SocketWithData, message: BaseMessage) {
    if (!ws.data) return;

    const { spaceId, instanceId } = message;

    try {
      // Check if space exists
      const space = await client.space.findUnique({
        where: { id: spaceId },
      });

      if (!space) {
        return sendError(ws, "Space not found");
      }

      // Check if instance exists if provided
      if (instanceId) {
        const instance = await client.spaceInstance.findUnique({
          where: {
            id: instanceId,
            spaceId: spaceId,
          },
        });

        if (!instance || !instance.isActive) {
          return sendError(ws, "Space instance not found or inactive");
        }
      }

      // Join the space room
      const roomId = `space:${spaceId}${instanceId ? `:${instanceId}` : ""}`;
      joinRoom(ws, roomId);

      // Create or update user presence in the space
      const presence = await client.spacePresence.upsert({
        where: {
          userId_spaceId_instanceId: {
            userId: ws.data.userId,
            spaceId: spaceId,
            instanceId: instanceId,
          },
        },
        update: {
          isActive: true,
          lastUpdated: new Date(),
          status: "Online",
        },
        create: {
          userId: ws.data.userId,
          spaceId: spaceId,
          instanceId: instanceId,
          status: "Online",
        },
      });

      // Notify others in the space about the new presence
      broadcastToRoom(
        roomId,
        {
          type: "userPresenceUpdate",
          action: "join",
          userId: ws.data.userId,
          username: ws.data.username,
          x: presence.x,
          y: presence.y,
          z: presence.z,
          rotationX: presence.rotationX,
          rotationY: presence.rotationY,
          rotationZ: presence.rotationZ,
          status: presence.status,
        },
        ws,
      );

      // Return a confirmation to the client
      ws.send(
        JSON.stringify({
          type: "joinSpaceConfirm",
          spaceId,
          instanceId,
        }),
      );

      // Send current users in the space to the joining user
      const presences = await client.spacePresence.findMany({
        where: {
          spaceId,
          instanceId,
          isActive: true,
          userId: { not: ws.data.userId },
        },
        include: {
          user: {
            select: {
              username: true,
            },
          },
        },
      });

      ws.send(
        JSON.stringify({
          type: "spaceUsers",
          spaceId,
          instanceId,
          users: presences.map((p) => ({
            userId: p.userId,
            username: p.user.username,
            x: p.x,
            y: p.y,
            z: p.z,
            rotationX: p.rotationX,
            rotationY: p.rotationY,
            rotationZ: p.rotationZ,
            status: p.status,
          })),
        }),
      );
    } catch (error) {
      console.error("Error joining space:", error);
      sendError(ws, "Failed to join space");
    }
  }

  // Handler for leaving a space
  async function handleLeaveSpace(ws: SocketWithData, message: BaseMessage) {
    if (!ws.data) return;

    const { spaceId, instanceId } = message;

    try {
      // Leave the space room
      const roomId = `space:${spaceId}${instanceId ? `:${instanceId}` : ""}`;
      leaveRoom(ws, roomId);

      // Update user presence
      await client.spacePresence.updateMany({
        where: {
          userId: ws.data.userId,
          spaceId: spaceId,
          instanceId: instanceId,
        },
        data: {
          isActive: false,
          lastUpdated: new Date(),
        },
      });

      // Notify others in the space
      broadcastToRoom(roomId, {
        type: "userPresenceUpdate",
        action: "leave",
        userId: ws.data.userId,
        username: ws.data.username,
      });

      // Return a confirmation to the client
      ws.send(
        JSON.stringify({
          type: "leaveSpaceConfirm",
          spaceId,
          instanceId,
        }),
      );
    } catch (error) {
      console.error("Error leaving space:", error);
      sendError(ws, "Failed to leave space");
    }
  }

  // Handler for updating position
  async function handleUpdatePosition(
    ws: SocketWithData,
    message: BaseMessage,
  ) {
    if (!ws.data) return;

    const { spaceId, instanceId, x, y, z, rotationX, rotationY, rotationZ } =
      message;

    try {
      // Update position in the database
      await client.spacePresence.updateMany({
        where: {
          userId: ws.data.userId,
          spaceId: spaceId,
          instanceId: instanceId,
          isActive: true,
        },
        data: {
          x,
          y,
          z,
          rotationX,
          rotationY,
          rotationZ,
          lastUpdated: new Date(),
        },
      });

      // Broadcast position update to others in the space
      const roomId = `space:${spaceId}${instanceId ? `:${instanceId}` : ""}`;
      broadcastToRoom(
        roomId,
        {
          type: "userPresenceUpdate",
          action: "move",
          userId: ws.data.userId,
          username: ws.data.username,
          x,
          y,
          z,
          rotationX,
          rotationY,
          rotationZ,
        },
        ws,
      );
    } catch (error) {
      console.error("Error updating position:", error);
      sendError(ws, "Failed to update position");
    }
  }

  // Handler for sending chat messages
  async function handleSendChatMessage(
    ws: SocketWithData,
    message: BaseMessage,
  ) {
    if (!ws.data) return;

    const { content, spaceId, channelId, recipientId } = message;

    try {
      if (!content || !content.trim()) {
        return sendError(ws, "Message content cannot be empty");
      }

      // Create the message in the database
      const chatMessage = await client.chatMessage.create({
        data: {
          content,
          senderId: ws.data.userId,
          spaceId,
          channelId,
          recipientId,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              displayName: true,
              currentAvatar: {
                select: {
                  id: true,
                  thumbnailUrl: true,
                },
              },
            },
          },
        },
      });

      // Format the message for sending
      const formattedMessage = {
        type: "chatMessage",
        id: chatMessage.id,
        content: chatMessage.content,
        createdAt: chatMessage.createdAt,
        sender: chatMessage.sender,
        spaceId,
        channelId,
        recipientId,
      };

      // Determine where to send the message
      if (spaceId) {
        // Space message - send to everyone in the space
        const roomId = `space:${spaceId}`;
        broadcastToRoom(roomId, formattedMessage);
        // Also send to the sender to confirm receipt
        ws.send(JSON.stringify(formattedMessage));
      } else if (recipientId) {
        // Direct message - send to recipient and sender
        sendToUser(recipientId, formattedMessage);
        // Also send to the sender if they're not the recipient
        if (recipientId !== ws.data.userId) {
          ws.send(JSON.stringify(formattedMessage));
        }
      }
    } catch (error) {
      console.error("Error sending chat message:", error);
      sendError(ws, "Failed to send message");
    }
  }

  // Handler for updating status
  async function handleUpdateStatus(ws: SocketWithData, message: BaseMessage) {
    if (!ws.data) return;

    const { status } = message;

    try {
      // Validate status
      if (!["Online", "Away", "Busy", "Invisible"].includes(status)) {
        return sendError(ws, "Invalid status");
      }

      // Update all active presences for this user
      await client.spacePresence.updateMany({
        where: {
          userId: ws.data.userId,
          isActive: true,
        },
        data: {
          status,
          lastUpdated: new Date(),
        },
      });

      // Get all active spaces the user is in
      const presences = await client.spacePresence.findMany({
        where: {
          userId: ws.data.userId,
          isActive: true,
        },
        select: {
          spaceId: true,
          instanceId: true,
        },
      });

      // Broadcast status update to all relevant spaces
      for (const presence of presences) {
        const roomId = `space:${presence.spaceId}${presence.instanceId ? `:${presence.instanceId}` : ""}`;
        broadcastToRoom(
          roomId,
          {
            type: "userPresenceUpdate",
            action: "status",
            userId: ws.data.userId,
            username: ws.data.username,
            status,
          },
          ws,
        );
      }

      // Send confirmation to client
      ws.send(
        JSON.stringify({
          type: "statusUpdateConfirm",
          status,
        }),
      );
    } catch (error) {
      console.error("Error updating status:", error);
      sendError(ws, "Failed to update status");
    }
  }

  // Handler for disconnect
  async function handleDisconnect(ws: SocketWithData) {
    if (!ws.data) return;

    try {
      console.log(`User disconnected: ${ws.data.username} (${ws.data.userId})`);

      // Update last online timestamp
      await client.user.update({
        where: { id: ws.data.userId },
        data: { lastOnline: new Date() },
      });

      // Mark all presences as inactive
      await client.spacePresence.updateMany({
        where: {
          userId: ws.data.userId,
          isActive: true,
        },
        data: {
          isActive: false,
          lastUpdated: new Date(),
        },
      });

      // Get all spaces the user was in
      const presences = await client.spacePresence.findMany({
        where: {
          userId: ws.data.userId,
          isActive: false, // They were just marked as inactive
        },
        select: {
          spaceId: true,
          instanceId: true,
        },
      });

      // Notify all relevant spaces about the disconnection
      for (const presence of presences) {
        const roomId = `space:${presence.spaceId}${presence.instanceId ? `:${presence.instanceId}` : ""}`;
        broadcastToRoom(roomId, {
          type: "userPresenceUpdate",
          action: "disconnect",
          userId: ws.data.userId,
          username: ws.data.username,
        });
      }

      // Remove client from all rooms
      for (const roomId of ws.data.rooms) {
        leaveRoom(ws, roomId);
      }

      // Remove client from clients map
      clients.delete(ws.data.userId);
    } catch (error) {
      console.error("Error handling disconnection:", error);
    }
  }

  // Helper function to send error messages
  function sendError(ws: SocketWithData, message: string) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "error",
          message,
        }),
      );
    }
  }

  // Return useful methods
  return {
    wss,
    broadcast: (message: any) => {
      const messageStr = JSON.stringify(message);
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(messageStr);
        }
      });
    },
    sendToUser,
    broadcastToRoom,
  };
}
