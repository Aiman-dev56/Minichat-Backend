import { Controller, Get, Param, UseGuards, Request, Post } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @UseGuards(JwtAuthGuard)
  @Get('conversation/:userId')
 test() {
  return { message: 'Chat API working' };
}
  
  async getConversation(@Request() req, @Param('userId') userId: string) {
    const messages = await this.chatService.getConversation(
      req.user.userId,
      userId,
    );
    await this.chatService.markAsRead(userId, req.user.userId);
    return messages;
  }

  @UseGuards(JwtAuthGuard)
  @Get('unread')
  async getUnread(@Request() req) {
    return this.chatService.getUnreadCount(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('read/:senderId')
  async markRead(@Request() req, @Param('senderId') senderId: string) {
    return this.chatService.markAsRead(senderId, req.user.userId);
  }
}
