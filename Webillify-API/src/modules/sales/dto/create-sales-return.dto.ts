import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
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

export class CreateSalesReturnItemDto {
  @ApiProperty()
  @IsUUID()
  salesInvoiceItemId!: string;

  @ApiProperty({ example: 1 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(999999999999)
  quantity!: number;
}

export class CreateSalesReturnDto {
  @ApiProperty()
  @IsUUID()
  salesInvoiceId!: string;

  @ApiProperty({ example: '2026-07-18T13:30:00.000Z' })
  @IsDateString({ strict: true })
  returnDate!: string;

  @ApiProperty({ example: 'Customer returned damaged goods.' })
  @IsString()
  @Length(5, 500)
  reason!: string;

  @ApiPropertyOptional({
    description: 'Open register used when money must be refunded.',
  })
  @IsOptional()
  @IsUUID()
  posSessionId?: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  refundMethod?: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 120)
  refundReference?: string;

  @ApiPropertyOptional({
    description: 'Client total used for mismatch detection.',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  expectedTotal?: number;

  @ApiProperty({ type: [CreateSalesReturnItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CreateSalesReturnItemDto)
  items!: CreateSalesReturnItemDto[];
}
