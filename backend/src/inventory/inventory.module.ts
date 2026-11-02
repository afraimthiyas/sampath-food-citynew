import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/product.entity';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { StockMovement } from './stock-movement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, StockMovement])],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
