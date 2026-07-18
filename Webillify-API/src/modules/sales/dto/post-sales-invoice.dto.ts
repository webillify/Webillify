import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, TaxTreatment } from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class PostSalesInvoiceItemDto {
  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty({ example: 1 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(999999999999)
  quantity!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount?: number;
}

export class PostSalesPaymentDto {
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiProperty({ example: 95 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999999999999)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 120)
  reference?: string;
}

export class PostSalesInvoiceDto {
  @ApiProperty()
  @IsUUID()
  posSessionId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty({ enum: TaxTreatment })
  @IsEnum(TaxTreatment)
  taxTreatment!: TaxTreatment;

  @ApiProperty({ example: '33' })
  @IsString()
  @Matches(/^[0-9]{2}$/)
  placeOfSupplyStateCode!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(-0.99)
  @Max(0.99)
  roundOff?: number;

  @ApiPropertyOptional({
    description: 'Client total used only for mismatch detection.',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  expectedTotal?: number;

  @ApiProperty({ type: [PostSalesInvoiceItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => PostSalesInvoiceItemDto)
  items!: PostSalesInvoiceItemDto[];

  @ApiProperty({ type: [PostSalesPaymentDto] })
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PostSalesPaymentDto)
  payments!: PostSalesPaymentDto[];
}
