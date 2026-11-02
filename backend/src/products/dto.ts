import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../common/pagination';

export class CreateProductDto {
  @ApiProperty({ example: 'GRN-0001' }) @IsString() @MinLength(2) @MaxLength(30) sku: string;
  @ApiProperty({ example: 'Samba Rice' }) @IsString() @MinLength(2) @MaxLength(120) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @ApiProperty({ example: 1450 }) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) price: number;
  @ApiProperty({ example: '5 kg' }) @IsString() @MaxLength(30) unit: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) imageUrl?: string;
  @ApiProperty() @IsUUID() categoryId: string;
  @ApiProperty({ example: 50, description: 'Opening stock; later changes go through /inventory/adjust' })
  @Type(() => Number) @IsInt() @Min(0) stock: number;
  @ApiProperty({ example: 10 }) @Type(() => Number) @IsInt() @Min(0) reorderLevel: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

/** Stock is intentionally not editable here - it must go through the inventory ledger. */
export class UpdateProductDto extends PartialType(OmitType(CreateProductDto, ['stock'] as const)) {}

export class ProductQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) search?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional({ enum: ['newest', 'price_asc', 'price_desc', 'name'] })
  @IsOptional() @IsIn(['newest', 'price_asc', 'price_desc', 'name']) sort?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean()
  inStock?: boolean;
}
