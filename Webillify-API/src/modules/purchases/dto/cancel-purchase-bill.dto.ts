import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class CancelPurchaseBillDto {
  @ApiProperty({
    example: 'Supplier invoice was entered for the wrong branch.',
  })
  @IsString()
  @Length(5, 500)
  reason!: string;
}
