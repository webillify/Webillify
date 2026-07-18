import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CancelSalesInvoiceDto {
  @ApiProperty({ example: 'Invoice was posted for the wrong customer.' })
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
}
