import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsDateString,
  Min,
  Max,
} from 'class-validator';

export class CreateMovieDto {
  @ApiProperty({ description: 'TMDB Movie ID' })
  @IsNumber()
  tmdbId: number;

  @ApiProperty({ description: 'Movie title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Movie overview/description' })
  @IsOptional()
  @IsString()
  overview?: string;

  @ApiPropertyOptional({ description: 'Poster image path' })
  @IsOptional()
  @IsString()
  posterPath?: string;

  @ApiPropertyOptional({ description: 'Backdrop image path' })
  @IsOptional()
  @IsString()
  backdropPath?: string;

  @ApiPropertyOptional({ description: 'Release date' })
  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @ApiPropertyOptional({ description: 'Vote average', minimum: 0, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  voteAverage?: number;

  @ApiPropertyOptional({ description: 'Vote count' })
  @IsOptional()
  @IsNumber()
  voteCount?: number;

  @ApiPropertyOptional({ description: 'Popularity score' })
  @IsOptional()
  @IsNumber()
  popularity?: number;

  @ApiPropertyOptional({ description: 'Genre IDs', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  genreIds?: number[];

  @ApiPropertyOptional({ description: 'Original language' })
  @IsOptional()
  @IsString()
  originalLanguage?: string;

  @ApiPropertyOptional({ description: 'Original title' })
  @IsOptional()
  @IsString()
  originalTitle?: string;

  @ApiPropertyOptional({ description: 'Adult content flag' })
  @IsOptional()
  @IsBoolean()
  adult?: boolean;

  @ApiPropertyOptional({ description: 'Video flag' })
  @IsOptional()
  @IsBoolean()
  video?: boolean;
}
