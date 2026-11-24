import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  addCartItemSchema,
  updateCartItemSchema,
  type AddCartItemInput,
  type UpdateCartItemInput,
} from '@meskot/shared-schemas';
import { JwtAuthGuard, type RequestWithUser } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CartService } from './cart.service';

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Req() req: RequestWithUser) {
    return this.cartService.getCart(req.user!.sub);
  }

  @Post('items')
  addItem(
    @Body(new ZodValidationPipe(addCartItemSchema)) body: AddCartItemInput,
    @Req() req: RequestWithUser,
  ) {
    return this.cartService.addItem(req.user!.sub, body);
  }

  @Patch('items/:id')
  updateItem(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCartItemSchema)) body: UpdateCartItemInput,
    @Req() req: RequestWithUser,
  ) {
    return this.cartService.updateItem(req.user!.sub, id, body);
  }

  @Delete('items/:id')
  removeItem(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.cartService.removeItem(req.user!.sub, id);
  }
}
