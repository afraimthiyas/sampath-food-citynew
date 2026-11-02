import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth-user';
import { CurrentUser, Roles, STAFF } from '../common/decorators';
import { AdjustStockDto, MovementQueryDto } from './dto';
import { InventoryService } from './inventory.service';

@ApiTags('Inventory')
@ApiBearerAuth()
@Roles(...STAFF)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('low-stock')
  lowStock() {
    return this.inventory.lowStock();
  }

  @Get('movements')
  movements(@Query() q: MovementQueryDto) {
    return this.inventory.history(q);
  }

  @Post('adjust')
  adjust(@Body() dto: AdjustStockDto, @CurrentUser() user: AuthUser) {
    return this.inventory.adjust(dto, user.id);
  }
}
