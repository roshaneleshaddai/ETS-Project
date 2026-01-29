import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { CustomersService } from '../customers/customers.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { Redis } from 'ioredis';
import * as nodemailer from 'nodemailer';

const OTP_TTL_SECONDS = 600; // 10 minutes
const OTP_LENGTH = 6;

@Injectable()
export class AuthService {
  private mailTransport: nodemailer.Transporter | null = null;

  constructor(
    private userService: UserService,
    private customersService: CustomersService,
    private jwtService: JwtService,
    private config: ConfigService,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {
    this.initMailer();
  }

  private initMailer() {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    console.log('Nodemailer Config Check:', {
      host: !!host,
      port,
      user: !!user,
      pass: !!pass, // Don't log the password itself
    });

    if (host && user && pass) {
      this.mailTransport = nodemailer.createTransport({
        host,
        port: port || 587,
        secure: port === 465,
        auth: { user, pass },
      });
      console.log('Nodemailer Initialized successfully');
    } else {
      console.error('Nodemailer Initialization Failed: Missing configuration');
      if (!host) console.error('Missing SMTP_HOST');
      if (!user) console.error('Missing SMTP_USER');
      if (!pass) console.error('Missing SMTP_PASS');
      this.mailTransport = null;
    }
  }

  private generateOtp(): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < OTP_LENGTH; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  }

  private async sendOtpEmail(email: string, otp: string): Promise<void> {
    const appName = this.config.get<string>('APP_NAME') || 'ETS';
    const html = `
      <p>Your one-time password for ${appName} is:</p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${otp}</p>
      <p>This code expires in 10 minutes. Do not share it with anyone.</p>
    `;
    if (this.mailTransport) {
      await this.mailTransport.sendMail({
        from: this.config.get<string>('SMTP_FROM') || this.config.get<string>('SMTP_USER'),
        to: email,
        subject: `${appName} – Your login code`,
        html,
      });
    } else {
      console.log(`[OTP] No SMTP configured. OTP for ${email}: ${otp}`);
    }
  }

  async sendOtp(email: string): Promise<{ message: string }> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      throw new BadRequestException('Email is required');
    }
    const otp = this.generateOtp();
    const key = `otp:${normalized}`;
    await this.redis.setex(key, OTP_TTL_SECONDS, otp);
    await this.sendOtpEmail(normalized, otp);
    return { message: 'OTP sent to your email' };
  }

  async verifyOtp(payload: {
    email: string;
    otp: string;
    name?: string;
    role?: string;
    phone?: string;
  }): Promise<{ access_token: string; user: any }> {
    const email = payload.email.trim().toLowerCase();
    const otp = payload.otp?.trim();
    if (!email || !otp) {
      throw new BadRequestException('Email and OTP are required');
    }
    const key = `otp:${email}`;
    const stored = await this.redis.get(key);
    if (!stored || stored !== otp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    await this.redis.del(key);

    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      return this.generateToken(existingUser);
    }

    // New user: require name for signup
    if (!payload.name?.trim()) {
      throw new BadRequestException('Name is required to create an account');
    }
    const role = payload.role === 'CUSTOMER' ? 'CUSTOMER' : 'CUSTOMER';
    const placeholderHash = await bcrypt.hash(
      Math.random().toString(36) + Date.now(),
      10,
    );
    const newUser = await this.userService.create({
      name: payload.name.trim(),
      email,
      role,
      auth: { passwordHash: placeholderHash },
      permissions: [],
    } as any);
    try {
      const customerData = {
        encryptedPII: {
          name: newUser.name,
          email: newUser.email,
          phone: payload.phone || '',
        },
        userId: newUser._id,
        loyalty: { verified: false },
        likedEvents: [],
      };
      await this.customersService.create(customerData as any);
    } catch (e) {
      console.error('Failed to create customer record:', e);
    }
    return this.generateToken(newUser);
  }

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
      phone: userData.phone || undefined,
      auth: {
        passwordHash: hashedPassword,
      },
    } as any);

    // 4. If role is CUSTOMER, create customer record
    if (userData.role === 'CUSTOMER') {
      try {
        const customerData = {
          encryptedPII: {
            name: userData.name,
            email: userData.email,
            phone: userData.phone || '',
          },
          userId: newUser._id,
          loyalty: {
            verified: false,
          },
          likedEvents: [],
        };
        await this.customersService.create(customerData as any);
      } catch (error) {
        console.error('Failed to create customer record:', error);
        // Optional: You might want to delete the user if customer creation fails
        // await this.userService.delete(newUser._id);
        // throw error;
      }
    }

    // 5. Return token
    return this.generateToken(newUser);
  }

  // LOGIN LOGIC
  async login(loginData: any) {
    // 1. Find user
    const user = await this.userService.findByEmail(loginData.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Compare passwords (OTP-only users have no passwordHash)
    if (!user.auth?.passwordHash) {
      throw new UnauthorizedException('Use Email OTP to sign in');
    }
    const isMatch = await bcrypt.compare(
      loginData.password,
      user.auth.passwordHash,
    );
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Generate Token
    return this.generateToken(user, loginData.rememberMe);
  }

  // FORGOT PASSWORD
  async forgotPassword(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      // Don't reveal that user does not exist
      return { message: 'If an account exists, an OTP has been sent.' };
    }
    await this.sendOtp(email);
    return { message: 'OTP sent to your email' };
  }

  // RESET PASSWORD
  async resetPassword(data: { email: string; otp: string; newPassword: string }) {
    // 1. Verify OTP
    const email = data.email.trim().toLowerCase();
    const otp = data.otp.trim();
    const key = `otp:${email}`;
    const stored = await this.redis.get(key);

    if (!stored || stored !== otp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // 2. Find User
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // 3. Update Password
    const hashedPassword = await bcrypt.hash(data.newPassword, 10);
    console.log('[DEBUG] Resetting password for:', email);

    // Safely get current auth object
    const currentAuth = user.auth && typeof (user.auth as any).toObject === 'function'
      ? (user.auth as any).toObject()
      : user.auth || {};

    const newAuth = { ...currentAuth, passwordHash: hashedPassword };

    await this.userService.update(user._id as any, {
      auth: newAuth
    } as any);

    console.log('[DEBUG] Update completed');

    // 4. Clear OTP
    await this.redis.del(key);

    return { message: 'Password reset successfully' };
  }

  // HELPER: Generate JWT
  private generateToken(user: any, rememberMe: boolean = false) {
    const payload = { sub: user._id, email: user.email };
    const expiresIn = rememberMe ? '30d' : '1h';
    return {
      access_token: this.jwtService.sign(payload, { expiresIn }),
      user,
    };
  }
}
