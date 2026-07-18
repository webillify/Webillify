import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsUUID, Length, Max, Min } from 'class-validator';

export class OpenPosSessionDto {
  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiProperty()
  @IsUUID()
  warehouseId!: string;

  @ApiProperty({ example: 'MAIN-REGISTER' })
  @IsString()
  @Length(1, 60)
  registerCode!: string;

  @ApiProperty({ example: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999999999)
  openingCash!: number;
}
