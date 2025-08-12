import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  SelectQueryBuilder,
  ILike,
  Between,
  DeepPartial,
} from 'typeorm';
import { Movie } from '../entities/movie.entity';
import {
  CreateMovieDto,
  UpdateMovieDto,
  QueryMovieDto,
  PaginatedResponseDto,
} from './dto';
import { Observable, from, of, throwError } from 'rxjs';
import {
  map,
  switchMap,
  tap,
  catchError,
  mergeMap,
  toArray,
  filter,
} from 'rxjs/operators';
import { TmdbService } from '../tmdb/tmdb.service';

@Injectable()
export class MoviesService {
  private readonly logger = new Logger(MoviesService.name);

  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    private readonly tmdbService: TmdbService,
  ) {}

  /**
   * Create a new movie using RxJS
   */
  create$(createMovieDto: CreateMovieDto): Observable<Movie> {
    return from(
      this.movieRepository.findOne({
        where: { tmdbId: createMovieDto.tmdbId },
      }),
    ).pipe(
      switchMap((existingMovie) => {
        if (existingMovie) {
          return throwError(
            () =>
              new Error(
                `Movie with TMDB ID ${createMovieDto.tmdbId} already exists`,
              ),
          );
        }
        const movie = this.movieRepository.create({
          ...createMovieDto,
          releaseDate: createMovieDto.releaseDate
            ? new Date(createMovieDto.releaseDate)
            : undefined,
        } as DeepPartial<Movie>);
        return from(this.movieRepository.save(movie));
      }),
      tap((movie) => this.logger.log(`Created movie: ${movie.title}`)),
      catchError((error: Error) => {
        this.logger.error('Error creating movie', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Find all movies with pagination and filters using functional approach
   */
  findAll$(query: QueryMovieDto): Observable<PaginatedResponseDto<Movie>> {
    const { page, limit } = query;

    return from(this.createQueryBuilder(query).getManyAndCount()).pipe(
      map(([movies, total]) => {
        return new PaginatedResponseDto(movies, total, page || 1, limit || 10);
      }),
      tap((result) =>
        this.logger.log(
          `Fetched ${result.data.length} movies (page ${page}/${result.meta.totalPages})`,
        ),
      ),
      catchError((error: Error) => {
        this.logger.error('Error fetching movies', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Find a single movie by ID
   */
  findOne$(id: number): Observable<Movie> {
    return from(
      this.movieRepository.findOne({
        where: { id },
        relations: ['ratings'],
      }),
    ).pipe(
      switchMap((movie) => {
        if (!movie) {
          return throwError(
            () => new NotFoundException(`Movie with ID ${id} not found`),
          );
        }
        return of(movie);
      }),
      tap((movie) => this.logger.log(`Fetched movie: ${movie.title}`)),
      catchError((error: Error) => {
        this.logger.error(`Error fetching movie ${id}`, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Find movie by TMDB ID
   */
  findByTmdbId$(tmdbId: number): Observable<Movie> {
    return from(
      this.movieRepository.findOne({
        where: { tmdbId },
        relations: ['ratings'],
      }),
    ).pipe(
      switchMap((movie) => {
        if (!movie) {
          // Try to fetch from TMDB API and save
          return this.fetchAndSaveFromTmdb$(tmdbId);
        }
        return of(movie);
      }),
      tap((movie) =>
        this.logger.log(`Fetched movie by TMDB ID: ${movie.title}`),
      ),
      catchError((error: Error) => {
        this.logger.error(`Error fetching movie by TMDB ID ${tmdbId}`, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Update a movie
   */
  update$(id: number, updateMovieDto: UpdateMovieDto): Observable<Movie> {
    return this.findOne$(id).pipe(
      switchMap((movie) => {
        const updatedMovie = {
          ...movie,
          ...updateMovieDto,
          releaseDate: updateMovieDto.releaseDate
            ? new Date(updateMovieDto.releaseDate)
            : movie.releaseDate,
        };
        return from(this.movieRepository.save(updatedMovie));
      }),
      tap((movie) => this.logger.log(`Updated movie: ${movie.title}`)),
      catchError((error: Error) => {
        this.logger.error(`Error updating movie ${id}`, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Remove a movie
   */
  remove$(id: number): Observable<void> {
    return this.findOne$(id).pipe(
      switchMap((movie) => from(this.movieRepository.remove(movie))),
      map(() => void 0),
      tap(() => this.logger.log(`Removed movie with ID ${id}`)),
      catchError((error: Error) => {
        this.logger.error(`Error removing movie ${id}`, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Search movies by title
   */
  search$(
    query: string,
    page: number = 1,
    limit: number = 20,
  ): Observable<PaginatedResponseDto<Movie>> {
    return from(
      this.movieRepository.findAndCount({
        where: { title: ILike(`%${query}%`) },
        skip: (page - 1) * limit,
        take: limit,
        order: { popularity: 'DESC' },
      }),
    ).pipe(
      map(
        ([movies, total]) =>
          new PaginatedResponseDto(movies, total, page, limit),
      ),
      tap((result) =>
        this.logger.log(
          `Found ${result.data.length} movies matching "${query}"`,
        ),
      ),
      catchError((error: Error) => {
        this.logger.error(`Error searching movies for "${query}"`, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get movies by genre using functional composition
   */
  findByGenre$(
    genreId: number,
    page: number = 1,
    limit: number = 20,
  ): Observable<PaginatedResponseDto<Movie>> {
    return from(
      this.movieRepository
        .createQueryBuilder('movie')
        .where(':genreId = ANY(movie.genreIds)', { genreId })
        .orderBy('movie.popularity', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount(),
    ).pipe(
      map(
        ([movies, total]) =>
          new PaginatedResponseDto(movies, total, page, limit),
      ),
      tap((result) =>
        this.logger.log(
          `Found ${result.data.length} movies for genre ${genreId}`,
        ),
      ),
      catchError((error: Error) => {
        this.logger.error(`Error fetching movies by genre ${genreId}`, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get top-rated movies (by user ratings)
   */
  getTopRated$(limit: number = 20): Observable<Movie[]> {
    return from(
      this.movieRepository.find({
        where: { userRatingCount: Between(1, Number.MAX_SAFE_INTEGER) },
        order: { userRatingAverage: 'DESC', userRatingCount: 'DESC' },
        take: limit,
      }),
    ).pipe(
      tap((movies) =>
        this.logger.log(`Fetched ${movies.length} top-rated movies`),
      ),
      catchError((error: Error) => {
        this.logger.error('Error fetching top-rated movies', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get trending movies (by popularity)
   */
  getTrending$(limit: number = 20): Observable<Movie[]> {
    return from(
      this.movieRepository.find({
        order: { popularity: 'DESC' },
        take: limit,
      }),
    ).pipe(
      tap((movies) =>
        this.logger.log(`Fetched ${movies.length} trending movies`),
      ),
      catchError((error: Error) => {
        this.logger.error('Error fetching trending movies', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Sync movie from TMDB API
   */
  syncFromTmdb$(tmdbId: number): Observable<Movie> {
    return this.tmdbService.getMovieDetails$(tmdbId).pipe(
      switchMap((tmdbMovie) => {
        return from(
          this.movieRepository.upsert(
            {
              tmdbId: tmdbMovie.id,
              title: tmdbMovie.title,
              overview: tmdbMovie.overview,
              posterPath: tmdbMovie.poster_path,
              backdropPath: tmdbMovie.backdrop_path,
              releaseDate: tmdbMovie.release_date
                ? new Date(tmdbMovie.release_date)
                : undefined,
              voteAverage: tmdbMovie.vote_average,
              voteCount: tmdbMovie.vote_count,
              popularity: tmdbMovie.popularity,
              genreIds: tmdbMovie.genre_ids || [],
              genres: tmdbMovie.genres,
              originalLanguage: tmdbMovie.original_language,
              originalTitle: tmdbMovie.original_title,
              adult: tmdbMovie.adult,
              video: tmdbMovie.video,
            },
            ['tmdbId'],
          ),
        ).pipe(switchMap(() => this.findByTmdbId$(tmdbId)));
      }),
      tap((movie) => this.logger.log(`Synced movie from TMDB: ${movie.title}`)),
      catchError((error: Error) => {
        this.logger.error(`Error syncing movie from TMDB ${tmdbId}`, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Batch operations using RxJS
   */
  batchCreate$(moviesDto: CreateMovieDto[]): Observable<Movie[]> {
    return from(moviesDto).pipe(
      mergeMap((dto) => this.create$(dto).pipe(catchError(() => of(null))), 5), // Concurrent limit of 5
      filter((movie): movie is Movie => movie !== null),
      toArray(),
      tap((movies) => this.logger.log(`Batch created ${movies.length} movies`)),
    );
  }

  /**
   * Update user rating statistics
   */
  updateRatingStatistics$(movieId: number): Observable<Movie> {
    return from(
      this.movieRepository
        .createQueryBuilder('movie')
        .leftJoin('movie.ratings', 'rating')
        .where('movie.id = :movieId', { movieId })
        .select('movie.id', 'id')
        .addSelect('AVG(rating.rating)', 'avgRating')
        .addSelect('COUNT(rating.id)', 'ratingCount')
        .getRawOne(),
    ).pipe(
      switchMap(
        (
          stats: { id: number; avgRating: number; ratingCount: number } | null,
        ) => {
          if (!stats) {
            return throwError(
              () => new NotFoundException(`Movie with ID ${movieId} not found`),
            );
          }
          return from(
            this.movieRepository.update(movieId, {
              userRatingAverage: stats.avgRating || 0,
              userRatingCount: stats.ratingCount || 0,
            }),
          ).pipe(switchMap(() => this.findOne$(movieId)));
        },
      ),
      tap((movie) =>
        this.logger.log(
          `Updated rating statistics for movie ${movie.title}: ${movie.userRatingAverage} (${movie.userRatingCount} ratings)`,
        ),
      ),
      catchError((error: Error) => {
        this.logger.error(
          `Error updating rating statistics for movie ${movieId}`,
          error,
        );
        return throwError(() => error);
      }),
    );
  }

  /**
   * Private helper to fetch and save movie from TMDB
   */
  private fetchAndSaveFromTmdb$(tmdbId: number): Observable<Movie> {
    return this.tmdbService.getMovieDetails$(tmdbId).pipe(
      switchMap((tmdbMovie) => {
        const movie = this.movieRepository.create({
          tmdbId: tmdbMovie.id,
          title: tmdbMovie.title,
          overview: tmdbMovie.overview,
          posterPath: tmdbMovie.poster_path,
          backdropPath: tmdbMovie.backdrop_path,
          releaseDate: tmdbMovie.release_date
            ? new Date(tmdbMovie.release_date)
            : undefined,
          voteAverage: tmdbMovie.vote_average,
          voteCount: tmdbMovie.vote_count,
          popularity: tmdbMovie.popularity,
          genreIds: tmdbMovie.genre_ids || [],
          genres: tmdbMovie.genres,
          originalLanguage: tmdbMovie.original_language,
          originalTitle: tmdbMovie.original_title,
          adult: tmdbMovie.adult,
          video: tmdbMovie.video,
        } as DeepPartial<Movie>);
        return from(this.movieRepository.save(movie));
      }),
    );
  }

  /**
   * Create query builder with filters
   */
  private createQueryBuilder(query: QueryMovieDto): SelectQueryBuilder<Movie> {
    const {
      page,
      limit,
      search,
      genreIds,
      yearFrom,
      yearTo,
      minRating,
      maxRating,
      sortBy,
      sortOrder,
      language,
      includeAdult,
    } = query;

    const qb = this.movieRepository.createQueryBuilder('movie');

    // Search filter
    if (search) {
      qb.andWhere(
        '(movie.title ILIKE :search OR movie.originalTitle ILIKE :search)',
        {
          search: `%${search}%`,
        },
      );
    }

    // Genre filter
    if (genreIds && genreIds.length > 0) {
      qb.andWhere('movie.genreIds && :genreIds', { genreIds });
    }

    // Year range filter
    if (yearFrom || yearTo) {
      const fromDate = yearFrom
        ? new Date(`${yearFrom}-01-01`)
        : new Date('1900-01-01');
      const toDate = yearTo ? new Date(`${yearTo}-12-31`) : new Date();
      qb.andWhere('movie.releaseDate BETWEEN :fromDate AND :toDate', {
        fromDate,
        toDate,
      });
    }

    // Rating filter
    if (minRating !== undefined) {
      qb.andWhere('movie.voteAverage >= :minRating', { minRating });
    }
    if (maxRating !== undefined) {
      qb.andWhere('movie.voteAverage <= :maxRating', { maxRating });
    }

    // Language filter
    if (language) {
      qb.andWhere('movie.originalLanguage = :language', { language });
    }

    // Adult content filter
    if (!includeAdult) {
      qb.andWhere('movie.adult = false');
    }

    // Sorting
    qb.orderBy(`movie.${sortBy}`, sortOrder);

    // Pagination
    const pageNum = page || 1;
    const limitNum = limit || 10;
    qb.skip((pageNum - 1) * limitNum).take(limitNum);

    return qb;
  }
}
