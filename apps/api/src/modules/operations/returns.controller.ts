import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSION_CODES } from '@meskot/shared-types';
import { JwtAuthGuard, type RequestWithUser } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ReturnsService } from './returns.service';

@ApiTags('Returns & Refunds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post('returns')
  createReturn(
    @Body()
    body: {
      orderNumber: string;
      reason: string;
      customerNote?: string;
      items: Array<{ orderItemId: string; quantity: number }>;
    },
    @Req() req: RequestWithUser,
  ) {
    return this.returnsService.createReturnRequest(req.user!.sub, body);
  }

  @Get('staff/returns')
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSION_CODES.RETURNS_MANAGE)
  listStaffReturns() {
    return this.returnsService.listStaffReturns();
  }

  @Patch('staff/returns/:id/review')
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSION_CODES.RETURNS_MANAGE)
  reviewReturn(
    @Param('id') id: string,
    @Body()
    body: {
      status: 'APPROVED' | 'REJECTED' | 'COMPLETED';
      restockDecision?: 'RESTOCKED' | 'DAMAGED_DISCARD';
      refundAmount?: number;
      staffNote?: string;
    },
    @Req() req: RequestWithUser,
  ) {
    return this.returnsService.reviewReturn(id, body, req.user!.sub);
  }
}
