import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseInterceptors,
} from '@nestjs/common';
import { MoviesService } from './movies.service';
import {
  CreateMovieDto,
  UpdateMovieDto,
  QueryMovieDto,
  PaginatedResponseDto,
} from './dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Movie } from '../entities/movie.entity';
import { Observable } from 'rxjs';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

@ApiTags('Movies')
@Controller('movies')
@UseInterceptors(CacheInterceptor)
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new movie' })
  @ApiResponse({
    status: 201,
    description: 'Movie created successfully',
    type: Movie,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Movie already exists' })
  create(@Body() createMovieDto: CreateMovieDto): Observable<Movie> {
    return this.moviesService.create$(createMovieDto);
  }

  @Get()
  @CacheTTL(60) // Cache for 60 seconds
  @ApiOperation({ summary: 'Get all movies with filters and pagination' })
  @ApiResponse({
    status: 200,
    description: 'List of movies',
    type: PaginatedResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'genreIds', required: false, type: [Number] })
  @ApiQuery({ name: 'yearFrom', required: false, type: Number })
  @ApiQuery({ name: 'yearTo', required: false, type: Number })
  @ApiQuery({ name: 'minRating', required: false, type: Number })
  @ApiQuery({ name: 'maxRating', required: false, type: Number })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: [
      'title',
      'releaseDate',
      'popularity',
      'voteAverage',
      'userRatingAverage',
    ],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'language', required: false, type: String })
  @ApiQuery({ name: 'includeAdult', required: false, type: Boolean })
  findAll(
    @Query() query: QueryMovieDto,
  ): Observable<PaginatedResponseDto<Movie>> {
    return this.moviesService.findAll$(query);
  }

  @Get('trending')
  @CacheTTL(300) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get trending movies' })
  @ApiResponse({
    status: 200,
    description: 'List of trending movies',
    type: [Movie],
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 20 })
  getTrending(
    @Query('limit', ParseIntPipe) limit: number = 20,
  ): Observable<Movie[]> {
    return this.moviesService.getTrending$(limit);
  }

  @Get('top-rated')
  @CacheTTL(300) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get top-rated movies by user ratings' })
  @ApiResponse({
    status: 200,
    description: 'List of top-rated movies',
    type: [Movie],
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 20 })
  getTopRated(
    @Query('limit', ParseIntPipe) limit: number = 20,
  ): Observable<Movie[]> {
    return this.moviesService.getTopRated$(limit);
  }

  @Get('search')
  @CacheTTL(60) // Cache for 60 seconds
  @ApiOperation({ summary: 'Search movies by title' })
  @ApiResponse({
    status: 200,
    description: 'Search results',
    type: PaginatedResponseDto,
  })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, default: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 20 })
  search(
    @Query('q') query: string,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 20,
  ): Observable<PaginatedResponseDto<Movie>> {
    return this.moviesService.search$(query, page, limit);
  }

  @Get('genre/:genreId')
  @CacheTTL(300) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get movies by genre' })
  @ApiResponse({
    status: 200,
    description: 'List of movies in genre',
    type: PaginatedResponseDto,
  })
  @ApiParam({ name: 'genreId', type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number, default: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 20 })
  findByGenre(
    @Param('genreId', ParseIntPipe) genreId: number,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 20,
  ): Observable<PaginatedResponseDto<Movie>> {
    return this.moviesService.findByGenre$(genreId, page, limit);
  }

  @Get('tmdb/:tmdbId')
  @CacheTTL(3600) // Cache for 1 hour
  @ApiOperation({ summary: 'Get movie by TMDB ID' })
  @ApiResponse({
    status: 200,
    description: 'Movie details',
    type: Movie,
  })
  @ApiResponse({ status: 404, description: 'Movie not found' })
  @ApiParam({ name: 'tmdbId', type: Number })
  findByTmdbId(
    @Param('tmdbId', ParseIntPipe) tmdbId: number,
  ): Observable<Movie> {
    return this.moviesService.findByTmdbId$(tmdbId);
  }

  @Post('sync/:tmdbId')
  @ApiOperation({ summary: 'Sync movie from TMDB API' })
  @ApiResponse({
    status: 200,
    description: 'Movie synced successfully',
    type: Movie,
  })
  @ApiResponse({ status: 404, description: 'Movie not found in TMDB' })
  @ApiParam({ name: 'tmdbId', type: Number })
  syncFromTmdb(
    @Param('tmdbId', ParseIntPipe) tmdbId: number,
  ): Observable<Movie> {
    return this.moviesService.syncFromTmdb$(tmdbId);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Create multiple movies in batch' })
  @ApiResponse({
    status: 201,
    description: 'Movies created successfully',
    type: [Movie],
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  batchCreate(@Body() createMoviesDto: CreateMovieDto[]): Observable<Movie[]> {
    return this.moviesService.batchCreate$(createMoviesDto);
  }

  @Get(':id')
  @CacheTTL(300) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get movie by ID' })
  @ApiResponse({
    status: 200,
    description: 'Movie details',
    type: Movie,
  })
  @ApiResponse({ status: 404, description: 'Movie not found' })
  @ApiParam({ name: 'id', type: Number })
  findOne(@Param('id', ParseIntPipe) id: number): Observable<Movie> {
    return this.moviesService.findOne$(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update movie' })
  @ApiResponse({
    status: 200,
    description: 'Movie updated successfully',
    type: Movie,
  })
  @ApiResponse({ status: 404, description: 'Movie not found' })
  @ApiParam({ name: 'id', type: Number })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMovieDto: UpdateMovieDto,
  ): Observable<Movie> {
    return this.moviesService.update$(id, updateMovieDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete movie' })
  @ApiResponse({ status: 204, description: 'Movie deleted successfully' })
  @ApiResponse({ status: 404, description: 'Movie not found' })
  @ApiParam({ name: 'id', type: Number })
  remove(@Param('id', ParseIntPipe) id: number): Observable<void> {
    return this.moviesService.remove$(id);
  }
}
