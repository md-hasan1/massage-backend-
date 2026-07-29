import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { config } from '../config';
import { verifyToken } from '../utils/jwt';
import User from '../app/modules/user/user.model';
import MessageService from '../app/modules/message/message.service';
import MessageRepository from '../app/modules/message/message.repository';
import ChatRepository from '../app/modules/chat/chat.repository';
import { sendPushNotification, sendCallPushNotification } from '../app/helpers/notification.helper';

// Keep track of active connections: Maps userId -> Array of socketIds
export const activeConnections = new Map<string, string[]>();
const messageService = new MessageService();
const messageRepository = new MessageRepository();
const chatRepository = new ChatRepository();

let ioInstance: SocketServer | null = null;

export const getIO = (): SocketServer => {
  if (!ioInstance) {
    throw new Error('Socket.io server has not been initialized');
  }
  return ioInstance;
};

export const emitToUser = (userId: any, event: string, data: any) => {
  const targetId = userId?.toString() ?? '';
  const socketIds = activeConnections.get(targetId);
  logger.debug(`emitToUser: userId = ${targetId}, event = ${event}, active socketIds = ${JSON.stringify(socketIds)}`);
  if (socketIds && socketIds.length > 0) {
    const io = getIO();
    socketIds.forEach((socketId) => {
      io.to(socketId).emit(event, data);
    });
  }
};

export const initializeSocket = (server: HttpServer): SocketServer => {
  const io = new SocketServer(server, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  ioInstance = io;

  // JWT Authentication Middleware for Sockets
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    let cleanToken = (token || '').trim();
    // Iteratively strip leading "Bearer ", quotes, and whitespace
    while (
      cleanToken.toLowerCase().startsWith('bearer ') ||
      (cleanToken.startsWith('"') && cleanToken.endsWith('"')) ||
      (cleanToken.startsWith("'") && cleanToken.endsWith("'"))
    ) {
      if (cleanToken.toLowerCase().startsWith('bearer ')) {
        cleanToken = cleanToken.slice(7).trim();
      } else {
        cleanToken = cleanToken.slice(1, -1).trim();
      }
    }

    logger.info(`Socket Handshake Token: ${cleanToken.substring(0, 20)}...`);
    const payload = verifyToken(cleanToken, config.jwt.accessSecret);

    if (!payload || !payload.userId) {
      logger.error(`Handshake failed for token payload: ${JSON.stringify(payload)}`);
      return next(new Error('Invalid or expired authentication token'));
    }

    // Attach userId to socket session as a string
    socket.data.userId = payload.userId.toString();
    next();
  });

  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId.toString();
    logger.info(`Socket client connected: SocketID = ${socket.id}, UserID = ${userId}`);

    // Register active connection
    const userSockets = activeConnections.get(userId) || [];
    userSockets.push(socket.id);
    activeConnections.set(userId, userSockets);

    // If it's the first connection for this user, mark online in database
    if (userSockets.length === 1) {
      try {
        await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
        socket.broadcast.emit('online', { userId });
      } catch (error) {
        logger.error(`Failed to update user online status: ${error}`);
      }
    }

    // Join a Chat Room
    socket.on('join_room', (chatId: string) => {
      socket.join(chatId);
      logger.debug(`Socket ${socket.id} joined room ${chatId}`);
    });

    // Leave a Chat Room
    socket.on('leave_room', (chatId: string) => {
      socket.leave(chatId);
      logger.debug(`Socket ${socket.id} left room ${chatId}`);
    });

    // Handle sending message
    socket.on(
      'message',
      async (
        messageData: {
          chatId: string;
          messageType: 'text' | 'image' | 'audio' | 'file' | 'call_log';
          content: string;
          fileInfo?: { name: string; size: number; mimeType: string };
          replyTo?: string;
        },
        callback?: Function
      ) => {
        try {
          const message = await messageService.sendMessage(userId, messageData);
          
          // Emit to all sockets in the chat room (including sender)
          io.to(messageData.chatId).emit('message', message);
          
          // If sender has a callback, trigger it with success
          if (callback) {
            callback({ status: 'success', data: message });
          }

          // Trigger push notifications & real-time updates for participants
          const chat = await chatRepository.findById(messageData.chatId);
          if (chat) {
            logger.debug(`Message socket handler: Chat participants = ${JSON.stringify(chat.participants.map(p => ({ id: p._id, name: (p as any).name })))}`);
            // Also emit the message to all participants individually so their chat lists update in real-time
            chat.participants.forEach((p: any) => {
              const participantId = p._id.toString();
              logger.debug(`Emitting message to participantId = ${participantId}`);
              emitToUser(participantId, 'message', message);
            });

            const sender = chat.participants.find(p => p._id.toString() === userId);
            const senderName = sender ? (sender as any).name : 'Someone';

            const otherParticipants = chat.participants.filter(p => p._id.toString() !== userId);
            for (const participant of otherParticipants) {
              const recipientId = participant._id.toString();
              const isUserConnected = activeConnections.has(recipientId);

              if (!isUserConnected) {
                let body = '';
                if (messageData.messageType === 'image') body = '📷 Photo';
                else if (messageData.messageType === 'audio') body = '🎵 Voice message';
                else if (messageData.messageType === 'file') body = `📄 ${messageData.fileInfo?.name || 'Document'}`;
                else if (messageData.messageType === 'call_log') {
                  try {
                    const info = JSON.parse(messageData.content);
                    const callName = info.isVideo ? 'Video call' : 'Voice call';
                    if (info.callStatus === 'missed') {
                      body = `📞 Missed ${callName}`;
                    } else if (info.callStatus === 'connected') {
                      body = `📞 ${callName} (${info.durationSeconds}s)`;
                    } else {
                      body = `📞 ${callName}`;
                    }
                  } catch (_) {
                    body = '📞 Call';
                  }
                } else body = messageData.content;

                sendPushNotification(recipientId, {
                  title: senderName,
                  body: body,
                  data: {
                    type: 'message',
                    chatId: messageData.chatId,
                  },
                }).catch(err => logger.error(`Failed to send message push notification: ${err.message}`));
              }
            }
          }
        } catch (error: any) {
          logger.error(`Error sending message over socket: ${error.message}`);
          if (callback) {
            callback({ status: 'error', message: error.message });
          }
        }
      }
    );

    // Handle typing indicator
    socket.on('typing', (chatId: string) => {
      socket.to(chatId).emit('typing', { chatId, userId });
    });

    // Handle stop typing indicator
    socket.on('stop_typing', (chatId: string) => {
      socket.to(chatId).emit('stop_typing', { chatId, userId });
    });

    // Handle user activity status (e.g. recording_audio, in_call, busy)
    socket.on('user_activity', (data: { chatId?: string; activity: string }) => {
      if (data.chatId) {
        socket.to(data.chatId).emit('user_activity', { chatId: data.chatId, userId, activity: data.activity });
      } else {
        socket.broadcast.emit('user_activity', { userId, activity: data.activity });
      }
    });

    // Handle message delivered
    socket.on('message_delivered', async (data: { chatId: string }) => {
      try {
        const now = new Date();
        await messageRepository.markAsDelivered(data.chatId, userId);
        const payload = { chatId: data.chatId, userId, deliveredAt: now.toISOString() };
        socket.to(data.chatId).emit('message_delivered', payload);

        // Also emit to all participants individually so their chat lists update
        const chat = await chatRepository.findById(data.chatId);
        if (chat) {
          chat.participants.forEach((p: any) => {
            const participantId = p._id.toString();
            if (participantId !== userId) {
              emitToUser(participantId, 'message_delivered', payload);
            }
          });
        }
      } catch (error) {
        logger.error(`Failed to mark messages as delivered: ${error}`);
      }
    });

    // Handle message seen (read receipts)
    socket.on('message_seen', async (data: { chatId: string }) => {
      try {
        const now = new Date();
        await messageRepository.markAsSeen(data.chatId, userId);
        await chatRepository.resetUnreadCount(data.chatId, userId);
        const payload = { chatId: data.chatId, userId, seenAt: now.toISOString(), deliveredAt: now.toISOString() };
        socket.to(data.chatId).emit('message_seen', payload);

        // Also emit to all participants individually so their chat lists update
        const chat = await chatRepository.findById(data.chatId);
        if (chat) {
          chat.participants.forEach((p: any) => {
            const participantId = p._id.toString();
            if (participantId !== userId) {
              emitToUser(participantId, 'message_seen', payload);
            }
          });
        }
      } catch (error) {
        logger.error(`Failed to mark messages as seen: ${error}`);
      }
    });

    // Handle Agora RTC Token Generation
    socket.on('request_agora_token', (data: { channelName: string; uid?: number }, callback?: Function) => {
      try {
        const { RtcTokenBuilder, RtcRole } = require('agora-token');
        const channelName = data.channelName;
        const uid = data.uid || 0; // 0 allows Agora to auto-assign or use numeric ID
        const role = RtcRole.PUBLISHER;
        const expirationTimeInSeconds = 3600 * 24; // 24 hours
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

        const token = RtcTokenBuilder.buildTokenWithUid(
          config.agora.appId,
          config.agora.appCertificate,
          channelName,
          uid,
          role,
          privilegeExpiredTs
        );

        logger.info(`Generated Agora RTC token for channel ${channelName}, uid ${uid}`);

        if (callback) {
          callback({ status: 'success', token, appId: config.agora.appId, channelName });
        }
      } catch (err: any) {
        logger.error(`Failed to generate Agora token: ${err.message}`);
        if (callback) {
          callback({ status: 'error', message: err.message });
        }
      }
    });

    // Handle calling (WebRTC signaling & Agora channel setup)
    socket.on('call_offer', async (data: { to: string; offer: any; isVideo?: boolean; chatId?: string; channelName?: string; agoraToken?: string }) => {
      logger.info(`Routing call_offer from ${userId} to ${data.to}`);
      emitToUser(data.to, 'call_offer', { from: userId, offer: data.offer, isVideo: data.isVideo, chatId: data.chatId, channelName: data.channelName, agoraToken: data.agoraToken });

      // Always dispatch high-priority FCM call push notification so background/terminated clients show full-screen incoming call UI
      try {
        const caller = await User.findById(userId);
        const callerName = caller ? caller.name : 'Incoming Call';
        const callerAvatar = caller ? caller.photoUrl : '';
        sendCallPushNotification(data.to, {
          callerName,
          callerAvatar,
          isVideo: data.isVideo ?? false,
          chatId: data.chatId,
          callerId: userId,
          offer: data.offer,
          channelName: data.channelName,
          agoraToken: data.agoraToken,
        });
      } catch (err: any) {
        logger.error(`Failed to send call push notification: ${err.message}`);
      }
    });

    socket.on('call_ringing', (data: { to: string }) => {
      logger.info(`Routing call_ringing from ${userId} to ${data.to}`);
      emitToUser(data.to, 'call_ringing', { from: userId });
    });

    socket.on('call_answer', (data: { to: string; answer: any }) => {
      logger.info(`Routing call_answer from ${userId} to ${data.to}`);
      emitToUser(data.to, 'call_answer', { from: userId, answer: data.answer });
    });

    socket.on('ice_candidate', (data: { to: string; candidate: any }) => {
      logger.debug(`Routing ice_candidate from ${userId} to ${data.to}`);
      emitToUser(data.to, 'ice_candidate', { from: userId, candidate: data.candidate });
    });

    socket.on('call_end', (data: { to: string; reason?: string }) => {
      logger.info(`Routing call_end from ${userId} to ${data.to} (reason: ${data.reason || 'ended'})`);
      emitToUser(data.to, 'call_end', { from: userId, reason: data.reason || 'ended' });
    });

    // Disconnect event handler
    socket.on('disconnect', async () => {
      logger.info(`Socket client disconnected: SocketID = ${socket.id}`);
      
      const currentSockets = activeConnections.get(userId) || [];
      const updatedSockets = currentSockets.filter((id) => id !== socket.id);

      if (updatedSockets.length === 0) {
        // Last connection closed, mark user offline
        activeConnections.delete(userId);
        try {
          const lastSeen = new Date();
          await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });
          socket.broadcast.emit('offline', { userId, lastSeen });
        } catch (error) {
          logger.error(`Failed to update user offline status: ${error}`);
        }
      } else {
        activeConnections.set(userId, updatedSockets);
      }
    });
  });

  return io;
};

export default initializeSocket;
