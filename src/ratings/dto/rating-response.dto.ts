import { ApiProperty } from '@nestjs/swagger';

export class RatingStatsDto {
  @ApiProperty({ description: 'Average rating' })
  average: number;

  @ApiProperty({ description: 'Total number of ratings' })
  count: number;

  @ApiProperty({ description: 'Distribution of ratings' })
  distribution: Record<string, number>;
}

export class UserRatingDto {
  @ApiProperty({ description: 'Rating ID' })
  id: number;

  @ApiProperty({ description: 'Movie ID' })
  movieId: number;

  @ApiProperty({ description: 'Movie title' })
  movieTitle: string;

  @ApiProperty({ description: 'Rating value' })
  rating: number;

  @ApiProperty({ description: 'Review text', nullable: true })
  review: string | null;

  @ApiProperty({ description: 'Created date' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated date' })
  updatedAt: Date;
}