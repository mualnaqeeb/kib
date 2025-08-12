import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import { RatingsService } from './ratings.service';
import {
  CreateRatingDto,
  UpdateRatingDto,
  RatingStatsDto,
  UserRatingDto,
} from './dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Rating } from '../entities/rating.entity';
import { Movie } from '../entities/movie.entity';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../entities/user.entity';

@ApiTags('Ratings')
@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post('movies/:movieId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rate a movie' })
  @ApiResponse({
    status: 201,
    description: 'Rating created/updated successfully',
    type: Rating,
  })
  @ApiResponse({ status: 404, description: 'Movie not found' })
  @ApiParam({ name: 'movieId', type: Number })
  rateMovie(
    @CurrentUser() user: User,
    @Param('movieId', ParseIntPipe) movieId: number,
    @Body() createRatingDto: CreateRatingDto,
  ): Observable<Rating> {
    return this.ratingsService.createOrUpdate$(
      user.id,
      movieId,
      createRatingDto,
    );
  }

  @Get('movies/:movieId')
  @ApiOperation({ summary: 'Get all ratings for a movie' })
  @ApiResponse({
    status: 200,
    description: 'List of ratings for the movie',
    type: [Rating],
  })
  @ApiParam({ name: 'movieId', type: Number })
  getMovieRatings(
    @Param('movieId', ParseIntPipe) movieId: number,
  ): Observable<Rating[]> {
    return this.ratingsService.findByMovie$(movieId);
  }

  @Get('movies/:movieId/stats')
  @ApiOperation({ summary: 'Get rating statistics for a movie' })
  @ApiResponse({
    status: 200,
    description: 'Rating statistics',
    type: RatingStatsDto,
  })
  @ApiParam({ name: 'movieId', type: Number })
  getMovieRatingStats(
    @Param('movieId', ParseIntPipe) movieId: number,
  ): Observable<RatingStatsDto> {
    return this.ratingsService.getMovieRatingStats$(movieId);
  }

  @Get('movies/:movieId/my-rating')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user rating for a movie' })
  @ApiResponse({
    status: 200,
    description: 'User rating for the movie',
    type: Rating,
  })
  @ApiParam({ name: 'movieId', type: Number })
  getMyRatingForMovie(
    @CurrentUser() user: User,
    @Param('movieId', ParseIntPipe) movieId: number,
  ): Observable<Rating | null> {
    return this.ratingsService.findUserRatingForMovie$(user.id, movieId);
  }

  @Get('my-ratings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all ratings by current user' })
  @ApiResponse({
    status: 200,
    description: 'List of user ratings',
    type: [UserRatingDto],
  })
  getMyRatings(@CurrentUser() user: User): Observable<UserRatingDto[]> {
    return this.ratingsService.findByUser$(user.id);
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get all ratings by a user' })
  @ApiResponse({
    status: 200,
    description: 'List of user ratings',
    type: [UserRatingDto],
  })
  @ApiParam({ name: 'userId', type: Number })
  getUserRatings(
    @Param('userId', ParseIntPipe) userId: number,
  ): Observable<UserRatingDto[]> {
    return this.ratingsService.findByUser$(userId);
  }

  @Get('top-rated')
  @ApiOperation({ summary: 'Get top-rated movies by users' })
  @ApiResponse({
    status: 200,
    description: 'List of top-rated movies',
    type: [Movie],
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 10 })
  getTopRatedMovies(
    @Query('limit', ParseIntPipe) limit: number = 10,
  ): Observable<Movie[]> {
    return this.ratingsService.getTopRatedMovies$(limit);
  }

  @Get('average')
  @ApiOperation({ summary: 'Get overall average rating across all movies' })
  @ApiResponse({
    status: 200,
    description: 'Overall average rating',
    schema: { type: 'number' },
  })
  getOverallAverageRating(): Observable<number> {
    return this.ratingsService.getOverallAverageRating$();
  }

  @Post('batch')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rate multiple movies at once' })
  @ApiResponse({
    status: 201,
    description: 'Ratings created successfully',
    type: [Rating],
  })
  batchRate(
    @CurrentUser() user: User,
    @Body() ratings: { movieId: number; rating: number; review?: string }[],
  ): Observable<Rating[]> {
    return this.ratingsService.batchRate$(user.id, ratings);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get rating by ID' })
  @ApiResponse({
    status: 200,
    description: 'Rating details',
    type: Rating,
  })
  @ApiResponse({ status: 404, description: 'Rating not found' })
  @ApiParam({ name: 'id', type: Number })
  findOne(@Param('id', ParseIntPipe) id: number): Observable<Rating> {
    return this.ratingsService.findOne$(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a rating' })
  @ApiResponse({
    status: 200,
    description: 'Rating updated successfully',
    type: Rating,
  })
  @ApiResponse({ status: 404, description: 'Rating not found' })
  @ApiResponse({ status: 403, description: 'Can only update own ratings' })
  @ApiParam({ name: 'id', type: Number })
  update(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRatingDto: UpdateRatingDto,
  ): Observable<Rating> {
    return this.ratingsService.update$(id, user.id, updateRatingDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a rating' })
  @ApiResponse({ status: 204, description: 'Rating deleted successfully' })
  @ApiResponse({ status: 404, description: 'Rating not found' })
  @ApiResponse({ status: 403, description: 'Can only delete own ratings' })
  @ApiParam({ name: 'id', type: Number })
  remove(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Observable<void> {
    return this.ratingsService.remove$(id, user.id);
  }
}