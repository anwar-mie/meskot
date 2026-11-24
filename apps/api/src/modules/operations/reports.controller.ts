import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSION_CODES } from '@meskot/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ReportsService } from './reports.service';

@ApiTags('Reports & Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('reports/sales')
  @Permissions(PERMISSION_CODES.REPORTS_READ)
  getSalesReport() {
    return this.reportsService.getSalesOverview();
  }

  @Get('audit-logs')
  @Permissions(PERMISSION_CODES.AUDIT_READ)
  listAuditLogs() {
    return this.reportsService.listAuditLogs();
  }
}
