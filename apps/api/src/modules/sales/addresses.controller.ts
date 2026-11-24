import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { createAddressSchema, type CreateAddressInput } from '@meskot/shared-schemas';
import { JwtAuthGuard, type RequestWithUser } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AddressesService } from './addresses.service';

@ApiTags('Addresses & Delivery Zones')
@Controller()
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get('delivery-zones')
  listDeliveryZones() {
    return this.addressesService.listDeliveryZones();
  }

  @Get('addresses')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listAddresses(@Req() req: RequestWithUser) {
    return this.addressesService.listAddresses(req.user!.sub);
  }

  @Post('addresses')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createAddress(
    @Body(new ZodValidationPipe(createAddressSchema)) body: CreateAddressInput,
    @Req() req: RequestWithUser,
  ) {
    return this.addressesService.createAddress(req.user!.sub, body);
  }

  @Delete('addresses/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  deleteAddress(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.addressesService.deleteAddress(req.user!.sub, id);
  }
}
