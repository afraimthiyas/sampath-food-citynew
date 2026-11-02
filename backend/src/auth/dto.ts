import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'nimali@example.com' })
  @IsEmail() email: string;

  @ApiProperty({ example: 'Passw0rdOk', description: 'Min 8 chars, at least one letter and one number' })
  @IsString() @MinLength(8) @MaxLength(72)
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, { message: 'password must contain at least one letter and one number' })
  password: string;

  @ApiProperty({ example: 'Nimali Perera' })
  @IsString() @MinLength(2) @MaxLength(80) fullName: string;

  @ApiPropertyOptional({ example: '0771234567' })
  @IsOptional() @IsString() @MaxLength(20) phone?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'admin@sampathfoodcity.demo' })
  @IsEmail() email: string;

  @ApiProperty({ example: 'Admin@123' })
  @IsString() @MinLength(1) password: string;
}
