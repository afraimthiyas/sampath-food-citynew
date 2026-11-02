import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Rice & Grains' })
  @IsString() @MinLength(2) @MaxLength(60) name: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(200) description?: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
