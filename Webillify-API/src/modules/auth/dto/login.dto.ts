import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'owner@webillify.demo' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ example: 'webillify', format: 'password' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  remember = false;
}
