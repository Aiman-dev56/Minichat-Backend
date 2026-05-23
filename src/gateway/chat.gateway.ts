import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from '../chat/chat.service';
import { UsersService } from '../users/users.service';
import * as dotenv from 'dotenv';
dotenv.config();

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSocketMap = new Map<string, string>(); // userId -> socketId

  constructor(
    private jwtService: JwtService,
    private chatService: ChatService,
    private usersService: UsersService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'supersecret_jwt_key',
      });
      client.data.userId = payload.userId;
      this.userSocketMap.set(payload.userId, client.id);

      await this.usersService.setOnlineStatus(payload.userId, true);
      this.server.emit('userStatus', { userId: payload.userId, isOnline: true });

      console.log(`User ${payload.userId} connected`);
    } catch (e) {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.userSocketMap.delete(userId);
      await this.usersService.setOnlineStatus(userId, false);
      this.server.emit('userStatus', {
        userId,
        isOnline: false,
        lastSeen: new Date(),
      });
      console.log(`User ${userId} disconnected`);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: string; content: string },
  ) {
    const senderId = client.data.userId;
    if (!senderId || !data?.receiverId || !data?.content?.trim()) return;

    const message = await this.chatService.createMessage(
      senderId,
      data.receiverId,
      data.content,
    );

    // Ensure sender is populated before emitting (never send null sender)
    if (!message || !message.sender) return;

    // Send to receiver if online
    const receiverSocketId = this.userSocketMap.get(data.receiverId);
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('newMessage', message);
    }

    // Confirm to sender
    client.emit('messageSent', message);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: string; isTyping: boolean },
  ) {
    const receiverSocketId = this.userSocketMap.get(data.receiverId);
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('typing', {
        senderId: client.data.userId,
        isTyping: data.isTyping,
      });
    }
  }

  @SubscribeMessage('markRead')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { senderId: string },
  ) {
    await this.chatService.markAsRead(data.senderId, client.data.userId);
    const senderSocketId = this.userSocketMap.get(data.senderId);
    if (senderSocketId) {
      this.server.to(senderSocketId).emit('messagesRead', {
        by: client.data.userId,
      });
    }
  }

  getOnlineUsers(): string[] {
    return Array.from(this.userSocketMap.keys());
  }
}