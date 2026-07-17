import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import {
  ArrayMaxSize,
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

export class SupplierPaymentAllocationDto {
  @ApiProperty()
  @IsUUID()
  purchaseBillId!: string;

  @ApiProperty({ example: 50 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999999999999)
  amount!: number;
}

export class CreateSupplierPaymentDto {
  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiProperty()
  @IsUUID()
  supplierId!: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiProperty({ example: 50 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999999999999)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 120)
  reference?: string;

  @ApiProperty({ example: '2026-07-17T12:00:00.000Z' })
  @IsDateString({ strict: true })
  paidAt!: string;

  @ApiProperty({ type: [SupplierPaymentAllocationDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SupplierPaymentAllocationDto)
  allocations!: SupplierPaymentAllocationDto[];
}
