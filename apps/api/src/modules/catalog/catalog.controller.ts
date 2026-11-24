import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSION_CODES } from '@meskot/shared-types';
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
} from '@meskot/shared-schemas';
import { JwtAuthGuard, type RequestWithUser } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CatalogService } from './catalog.service';

@ApiTags('Catalog')
@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('categories')
  listCategories() {
    return this.catalogService.listCategories();
  }

  @Get('products')
  listProducts(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('featured') featured?: string,
    @Query('inStock') inStock?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('sort') sort?: string,
  ) {
    return this.catalogService.listProducts({
      category,
      search,
      featured: featured === 'true',
      inStock: inStock === 'true',
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sort,
    });
  }

  @Get('products/:slug')
  getProduct(@Param('slug') slug: string) {
    return this.catalogService.getProductBySlug(slug);
  }

  @Get('staff/products')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION_CODES.PRODUCTS_READ)
  listStaffProducts(@Query('search') search?: string, @Query('status') status?: string) {
    return this.catalogService.listStaffProducts(search, status);
  }

  @Get('staff/products/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION_CODES.PRODUCTS_READ)
  getStaffProduct(@Param('id') id: string) {
    return this.catalogService.getStaffProductById(id);
  }

  @Post('products')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION_CODES.PRODUCTS_CREATE)
  createProduct(
    @Body(new ZodValidationPipe(createProductSchema)) body: CreateProductInput,
    @Req() req: RequestWithUser,
  ) {
    return this.catalogService.createProduct(body, req.user!.sub);
  }

  @Patch('products/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION_CODES.PRODUCTS_UPDATE)
  updateProduct(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) body: UpdateProductInput,
    @Req() req: RequestWithUser,
  ) {
    return this.catalogService.updateProduct(id, body, req.user!.sub);
  }

  @Patch('products/:id/archive')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION_CODES.PRODUCTS_ARCHIVE)
  archiveProduct(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.catalogService.archiveProduct(id, req.user!.sub);
  }
}
