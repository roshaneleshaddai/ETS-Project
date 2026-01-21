import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService, // Injecting UserService
    private jwtService: JwtService,
  ) {}

  // SIGNUP LOGIC
  async signup(userData: any) {
    // 1. Check if user exists
    const existingUser = await this.userService.findByEmail(userData.email);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // 2. Hash the password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // 3. Create user in DB via UserService
    const newUser = await this.userService.create({
      ...userData,
      auth: {
        passwordHash: hashedPassword,
      },
    });

    // 4. Return token (optional) or just success message
    return this.generateToken(newUser);
  }

  // LOGIN LOGIC
  async login(loginData: any) {
    // 1. Find user
    const user = await this.userService.findByEmail(loginData.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Compare passwords
    const isMatch = await bcrypt.compare(
      loginData.password,
      user.auth.passwordHash,
    );
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Generate Token
    return this.generateToken(user);
  }

  // HELPER: Generate JWT
  private generateToken(user: any) {
    const payload = { sub: user._id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }
}
