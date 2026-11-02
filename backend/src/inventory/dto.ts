import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, NotEquals } from 'class-validator';
import { PaginationQueryDto } from '../common/pagination';
import { StockReason } from './stock-movement.entity';

export class AdjustStockDto {
  @ApiProperty() @IsUUID() productId: string;

  @ApiProperty({ example: 24, description: 'Positive to add stock, negative to remove (non-zero)' })
  @Type(() => Number) @IsInt() @NotEquals(0) delta: number;

  @ApiProperty({ enum: [StockReason.PURCHASE, StockReason.ADJUSTMENT, StockReason.DAMAGE] })
  @IsEnum(StockReason) reason: StockReason;

  @ApiPropertyOptional({ example: 'Weekly supplier delivery' })
  @IsOptional() @IsString() @MaxLength(200) note?: string;
}

export class MovementQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() productId?: string;
}
