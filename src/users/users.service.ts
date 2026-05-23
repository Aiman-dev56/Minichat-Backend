import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(data: {
    name: string;
    email: string;
    password: string;
    avatar?: string;
    avatarPublicId?: string;
  }): Promise<UserDocument> {
    const hashed = await bcrypt.hash(data.password, 10);
    const user = new this.userModel({ ...data, password: hashed });
    return user.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('-password');
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().select('-password').lean();
  }

  async updateAvatar(
    userId: string,
    avatar: string,
    avatarPublicId: string,
  ): Promise<UserDocument> {
    return this.userModel
      .findByIdAndUpdate(userId, { avatar, avatarPublicId }, { new: true })
      .select('-password');
  }

  async setOnlineStatus(userId: string, isOnline: boolean) {
    return this.userModel.findByIdAndUpdate(
      userId,
      { isOnline, lastSeen: isOnline ? undefined : new Date() },
      { new: true },
    );
  }

  async sanitize(user: UserDocument) {
    const obj = user.toObject ? user.toObject() : user;
    const { password, ...rest } = obj as any;
    return rest;
  }
}
