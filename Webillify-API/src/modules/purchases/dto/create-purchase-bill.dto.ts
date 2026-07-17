import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export enum PurchaseTaxTreatment {
  INTRASTATE = 'INTRASTATE',
  INTERSTATE = 'INTERSTATE',
}

export class CreatePurchaseBillItemDto {
  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 240)
  description?: string;

  @ApiProperty({ example: 2 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(999999999999)
  quantity!: number;

  @ApiProperty({ example: 45 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(999999999999)
  unitCost!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount?: number;

  @ApiProperty({ example: 5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxRate!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  cessRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  inputTaxEligible?: boolean;
}

export class CreatePurchaseBillDto {
  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiProperty()
  @IsUUID()
  warehouseId!: string;

  @ApiProperty()
  @IsUUID()
  supplierId!: string;

  @ApiProperty({ example: 'SUPPLIER-INV-001' })
  @IsString()
  @Length(1, 100)
  supplierInvoiceReference!: string;

  @ApiProperty({ example: '2026-07-17' })
  @IsDateString({ strict: true })
  invoiceDate!: string;

  @ApiPropertyOptional({ example: '2026-08-16' })
  @IsOptional()
  @IsDateString({ strict: true })
  dueDate?: string;

  @ApiProperty({ enum: PurchaseTaxTreatment })
  @IsEnum(PurchaseTaxTreatment)
  taxTreatment!: PurchaseTaxTreatment;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  inputTaxEligible?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(-0.99)
  @Max(0.99)
  roundOff?: number;

  @ApiPropertyOptional({
    description: 'Client total used for mismatch detection.',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  expectedTotal?: number;

  @ApiProperty({ type: [CreatePurchaseBillItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseBillItemDto)
  items!: CreatePurchaseBillItemDto[];
}
