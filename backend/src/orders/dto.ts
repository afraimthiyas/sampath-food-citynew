import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min,
  MinLength, ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../common/pagination';
import { OrderStatus, PaymentMethod } from './order.entity';

export class OrderItemInputDto {
  @ApiProperty() @IsUUID() productId: string;
  @ApiProperty({ example: 2 }) @Type(() => Number) @IsInt() @Min(1) @Max(99) quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemInputDto] })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(60) @ValidateNested({ each: true }) @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];

  @ApiProperty({ example: '45 Galle Road, Mount Lavinia' }) @IsString() @MinLength(5) @MaxLength(200)
  deliveryAddress: string;

  @ApiProperty({ example: 'Colombo' }) @IsString() @MinLength(2) @MaxLength(60) deliveryCity: string;

  @ApiProperty({ example: '0771234567' })
  @Matches(/^[0-9+\-\s]{7,20}$/, { message: 'phone must be a valid phone number' }) phone: string;

  @ApiProperty({ enum: PaymentMethod }) @IsEnum(PaymentMethod) paymentMethod: PaymentMethod;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) note?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus }) @IsEnum(OrderStatus) status: OrderStatus;
}

export class OrderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus }) @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
  @ApiPropertyOptional({ description: 'Order number, customer name or email' })
  @IsOptional() @IsString() @MaxLength(100) search?: string;
}
