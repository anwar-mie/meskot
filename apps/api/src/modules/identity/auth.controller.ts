import { Body, Controller, Get, Post, Req, UseGuards, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import {
  loginSchema,
  otpRequestSchema,
  otpVerifySchema,
  passwordResetConfirmSchema,
  refreshTokenSchema,
  registerSchema,
  type LoginInput,
  type OtpRequestInput,
  type OtpVerifyInput,
  type PasswordResetConfirmInput,
  type RegisterInput,
} from '@meskot/shared-schemas';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard, type RequestWithUser } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UsePipes(new ZodValidationPipe(registerSchema))
  register(@Body() body: RegisterInput, @Req() req: Request) {
    return this.authService.register(body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('login')
  @UsePipes(new ZodValidationPipe(loginSchema))
  login(@Body() body: LoginInput, @Req() req: Request) {
    return this.authService.login(body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('otp/request')
  @UsePipes(new ZodValidationPipe(otpRequestSchema))
  requestOtp(@Body() body: OtpRequestInput) {
    return this.authService.requestOtp(body);
  }

  @Post('otp/verify')
  @UsePipes(new ZodValidationPipe(otpVerifySchema))
  verifyOtp(@Body() body: OtpVerifyInput, @Req() req: Request) {
    return this.authService.verifyOtp(body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('password-reset/confirm')
  @UsePipes(new ZodValidationPipe(passwordResetConfirmSchema))
  confirmPasswordReset(@Body() body: PasswordResetConfirmInput, @Req() req: Request) {
    return this.authService.confirmPasswordReset(body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('refresh')
  @UsePipes(new ZodValidationPipe(refreshTokenSchema))
  refresh(@Body() body: { refreshToken: string }, @Req() req: Request) {
    return this.authService.refresh(body.refreshToken, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('logout')
  @UsePipes(new ZodValidationPipe(refreshTokenSchema))
  logout(@Body() body: { refreshToken: string }) {
    return this.authService.logout(body.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@Req() req: RequestWithUser) {
    return { user: req.user };
  }

  @Post('locale')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  updateLocale(@Body() body: { locale: 'en' | 'am' }, @Req() req: RequestWithUser) {
    const locale = body.locale === 'am' ? 'am' : 'en';
    return this.authService.updatePreferredLocale(req.user!.sub, locale);
  }
}
