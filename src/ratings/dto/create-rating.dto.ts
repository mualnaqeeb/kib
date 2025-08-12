import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateRatingDto {
  @ApiProperty({
    description: 'Rating value',
    minimum: 0.5,
    maximum: 10,
    example: 8.5,
  })
  @IsNumber()
  @Min(0.5)
  @Max(10)
  rating: number;

  @ApiPropertyOptional({
    description: 'Optional review text',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  review?: string;
}
