import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth-user';
import { CurrentUser, Public, Roles, STAFF } from '../common/decorators';
import { CreateProductDto, ProductQueryDto, UpdateProductDto } from './dto';
import { ProductsService } from './products.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  /** Public storefront listing - active products only. */
  @Public()
  @Get()
  list(@Query() query: ProductQueryDto) {
    return this.products.search(query, { includeInactive: false });
  }

  /** Back-office listing - includes archived products. */
  @ApiBearerAuth() @Roles(...STAFF)
  @Get('manage')
  manage(@Query() query: ProductQueryDto) {
    return this.products.search(query, { includeInactive: true });
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.findOne(id);
  }

  @ApiBearerAuth() @Roles(...STAFF)
  @Post()
  create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser) {
    return this.products.create(dto, user.id);
  }

  @ApiBearerAuth() @Roles(...STAFF)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @ApiBearerAuth() @Roles(...STAFF)
  @Delete(':id') @HttpCode(204)
  archive(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.archive(id);
  }
}
