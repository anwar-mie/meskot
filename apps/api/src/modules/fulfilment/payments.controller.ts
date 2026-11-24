import { Body, Controller, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { initializePaymentSchema, type InitializePaymentInput } from '@meskot/shared-schemas';
import { JwtAuthGuard, type RequestWithUser } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initialize')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  initialize(
    @Body(new ZodValidationPipe(initializePaymentSchema)) body: InitializePaymentInput,
    @Req() req: RequestWithUser,
  ) {
    return this.paymentsService.initializePayment(req.user!.sub, body);
  }

  @Post('webhooks/:provider')
  webhook(
    @Param('provider') provider: string,
    @Body() body: Record<string, unknown>,
    @Headers('x-chapa-signature') xChapaSig?: string,
    @Headers('chapa-signature') chapaSig?: string,
  ) {
    return this.paymentsService.handleWebhook(provider, body, xChapaSig ?? chapaSig);
  }
}
