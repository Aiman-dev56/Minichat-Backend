import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async register(
    name: string,
    email: string,
    password: string,
    avatarFile?: Express.Multer.File,
  ) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) throw new ConflictException('Email already registered');

    let avatar = null;
    let avatarPublicId = null;

    if (avatarFile) {
      const result = await this.cloudinaryService.uploadImage(avatarFile);
      avatar = result.secure_url;
      avatarPublicId = result.public_id;
    }

    const user = await this.usersService.create({
      name,
      email,
      password,
      avatar,
      avatarPublicId,
    });

    const token = this.jwtService.sign({ userId: user._id, email: user.email });
    const safe = await this.usersService.sanitize(user);
    return { token, user: safe };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const token = this.jwtService.sign({ userId: user._id, email: user.email });
    const safe = await this.usersService.sanitize(user);
    return { token, user: safe };
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }
}
