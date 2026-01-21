import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth') // Routes start with /auth
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  signup(@Body() signUpDto: any) {
    // Ideally create a DTO class for type safety
    return this.authService.signup(signUpDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() loginDto: any) {
    return this.authService.login(loginDto);
  }
}
