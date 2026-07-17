import { ApiProperty } from '@nestjs/swagger';
import { StockMovementType } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

export class StockAdjustmentDto {
  @ApiProperty()
  @IsUUID()
  warehouseId!: string;

  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty({ enum: ['ADJUSTMENT_IN', 'ADJUSTMENT_OUT'] })
  @IsEnum(StockMovementType)
  movementType!: StockMovementType;

  @ApiProperty({ example: 2 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(999999999999)
  quantity!: number;

  @ApiProperty({ example: 45 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  unitCost!: number;

  @ApiProperty()
  @IsUUID()
  sourceId!: string;

  @ApiProperty({ example: 'Approved cycle-count difference' })
  @IsString()
  @Length(3, 240)
  reason!: string;
}
