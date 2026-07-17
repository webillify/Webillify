import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ example: 'SUP-001' })
  @IsString()
  @Length(1, 60)
  code!: string;

  @ApiProperty({ example: 'Example Wholesale Supplier' })
  @IsString()
  @Length(1, 180)
  name!: string;

  @ApiPropertyOptional({ example: '33ABCDE1234F1Z5' })
  @IsOptional()
  @IsString()
  @Length(15, 15)
  gstin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(3, 30)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @Length(3, 320)
  email?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3650)
  creditDays?: number;
}
