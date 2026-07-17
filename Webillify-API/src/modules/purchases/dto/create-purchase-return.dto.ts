import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreatePurchaseReturnItemDto {
  @ApiProperty()
  @IsUUID()
  purchaseBillItemId!: string;

  @ApiProperty({ example: 1 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(999999999999)
  quantity!: number;
}

export class CreatePurchaseReturnDto {
  @ApiProperty()
  @IsUUID()
  purchaseBillId!: string;

  @ApiProperty({ example: '2026-07-17' })
  @IsDateString({ strict: true })
  returnDate!: string;

  @ApiProperty({ example: 'Damaged goods returned to the supplier.' })
  @IsString()
  @Length(5, 500)
  reason!: string;

  @ApiPropertyOptional({
    description: 'Client total used for mismatch detection.',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  expectedTotal?: number;

  @ApiProperty({ type: [CreatePurchaseReturnItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseReturnItemDto)
  items!: CreatePurchaseReturnItemDto[];
}
