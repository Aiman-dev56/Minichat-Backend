import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './message.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  async createMessage(
    senderId: string,
    receiverId: string,
    content: string,
  ): Promise<MessageDocument> {
    const msg = new this.messageModel({
      sender: new Types.ObjectId(senderId),
      receiver: new Types.ObjectId(receiverId),
      content,
    });
    const saved = await msg.save();
    return this.messageModel
      .findById(saved._id)
      .populate('sender', 'name avatar email')
      .populate('receiver', 'name avatar email');
  }

  async getConversation(
    userId1: string,
    userId2: string,
  ): Promise<MessageDocument[]> {
    return this.messageModel
      .find({
        $or: [
          {
            sender: new Types.ObjectId(userId1),
            receiver: new Types.ObjectId(userId2),
          },
          {
            sender: new Types.ObjectId(userId2),
            receiver: new Types.ObjectId(userId1),
          },
        ],
      })
      .populate('sender', 'name avatar email')
      .populate('receiver', 'name avatar email')
      .sort({ createdAt: 1 });
  }

  async markAsRead(senderId: string, receiverId: string) {
    return this.messageModel.updateMany(
      {
        sender: new Types.ObjectId(senderId),
        receiver: new Types.ObjectId(receiverId),
        read: false,
      },
      { read: true },
    );
  }

  async getUnreadCount(userId: string): Promise<Record<string, number>> {
    const counts = await this.messageModel.aggregate([
      {
        $match: {
          receiver: new Types.ObjectId(userId),
          read: false,
        },
      },
      {
        $group: {
          _id: '$sender',
          count: { $sum: 1 },
        },
      },
    ]);
    return counts.reduce((acc, c) => {
      acc[c._id.toString()] = c.count;
      return acc;
    }, {});
  }
}
