import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { PriceTaxMode, ProductType } from '@prisma/client';

export class CreateProductDto {
  @ApiProperty({ example: 'RICE-PREMIUM' })
  @IsString()
  @Length(1, 60)
  code!: string;

  @ApiProperty({ example: 'Premium Rice' })
  @IsString()
  @Length(1, 180)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty()
  @IsUUID()
  baseUnitId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  taxRateId?: string;

  @ApiPropertyOptional({ enum: ProductType, default: ProductType.GOODS })
  @IsOptional()
  @IsEnum(ProductType)
  productType?: ProductType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 12)
  hsnSac?: string;

  @ApiPropertyOptional({ enum: PriceTaxMode })
  @IsOptional()
  @IsEnum(PriceTaxMode)
  priceTaxMode?: PriceTaxMode;

  @ApiProperty({ example: 'RICE-PREMIUM-1KG' })
  @IsString()
  @Length(1, 80)
  sku!: string;

  @ApiPropertyOptional({ example: '1 kg' })
  @IsOptional()
  @IsString()
  @Length(1, 140)
  variantName?: string;

  @ApiProperty({ example: 60 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999999999)
  salePrice!: number;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  purchaseCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 80)
  barcode?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;
}
