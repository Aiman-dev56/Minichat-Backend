import {
  Controller,
  Get,
  Patch,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private cloudinaryService: CloudinaryService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllUsers(@Request() req) {
    const users = await this.usersService.findAll();

    return users.filter(
      (u: any) => u._id.toString() !== req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  async updateAvatar(
    @Request() req,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      return { message: 'No file provided' };
    }

    const result = await this.cloudinaryService.uploadImage(file);

    const user = await this.usersService.updateAvatar(
      req.user.userId,
      result.secure_url,
      result.public_id,
    );

    return user;
  }
}