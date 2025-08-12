import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rating } from '../entities/rating.entity';
import { Movie } from '../entities/movie.entity';
import { User } from '../entities/user.entity';
import { CreateRatingDto, UpdateRatingDto, RatingStatsDto, UserRatingDto } from './dto';
import { Observable, from, of, throwError, forkJoin } from 'rxjs';
import {
  map,
  switchMap,
  tap,
  catchError,
  mergeMap,
  toArray,
  reduce,
} from 'rxjs/operators';
import { MoviesService } from '../movies/movies.service';

@Injectable()
export class RatingsService {
  private readonly logger = new Logger(RatingsService.name);

  constructor(
    @InjectRepository(Rating)
    private readonly ratingRepository: Repository<Rating>,
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly moviesService: MoviesService,
  ) {}

  /**
   * Create or update a rating for a movie
   */
  createOrUpdate$(
    userId: number,
    movieId: number,
    createRatingDto: CreateRatingDto,
  ): Observable<Rating> {
    return forkJoin({
      movie: from(this.movieRepository.findOne({ where: { id: movieId } })),
      user: from(this.userRepository.findOne({ where: { id: userId } })),
      existingRating: from(
        this.ratingRepository.findOne({
          where: { userId, movieId },
        }),
      ),
    }).pipe(
      switchMap(({ movie, user, existingRating }) => {
        if (!movie) {
          return throwError(
            () => new NotFoundException(`Movie with ID ${movieId} not found`),
          );
        }
        if (!user) {
          return throwError(
            () => new NotFoundException(`User with ID ${userId} not found`),
          );
        }

        if (existingRating) {
          // Update existing rating
          existingRating.rating = createRatingDto.rating;
          existingRating.review = createRatingDto.review || existingRating.review;
          return from(this.ratingRepository.save(existingRating));
        } else {
          // Create new rating
          const rating = this.ratingRepository.create({
            userId,
            movieId,
            user,
            movie,
            ...createRatingDto,
          });
          return from(this.ratingRepository.save(rating));
        }
      }),
      // Update movie's user rating statistics
      switchMap((rating) =>
        this.moviesService.updateRatingStatistics$(movieId).pipe(
          map(() => rating),
        ),
      ),
      tap((rating) =>
        this.logger.log(
          `${rating.id ? 'Updated' : 'Created'} rating for movie ${movieId} by user ${userId}: ${rating.rating}`,
        ),
      ),
      catchError((error) => {
        this.logger.error(
          `Error creating/updating rating for movie ${movieId} by user ${userId}`,
          error,
        );
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get all ratings for a movie with functional approach
   */
  findByMovie$(movieId: number): Observable<Rating[]> {
    return from(
      this.ratingRepository.find({
        where: { movieId },
        relations: ['user'],
        order: { createdAt: 'DESC' },
      }),
    ).pipe(
      tap((ratings) =>
        this.logger.log(
          `Fetched ${ratings.length} ratings for movie ${movieId}`,
        ),
      ),
      catchError((error) => {
        this.logger.error(
          `Error fetching ratings for movie ${movieId}`,
          error,
        );
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get all ratings by a user
   */
  findByUser$(userId: number): Observable<UserRatingDto[]> {
    return from(
      this.ratingRepository.find({
        where: { userId },
        relations: ['movie'],
        order: { createdAt: 'DESC' },
      }),
    ).pipe(
      map((ratings) =>
        ratings.map((rating) => ({
          id: rating.id,
          movieId: rating.movieId,
          movieTitle: rating.movie?.title || 'Unknown',
          rating: rating.rating,
          review: rating.review,
          createdAt: rating.createdAt,
          updatedAt: rating.updatedAt,
        })),
      ),
      tap((ratings) =>
        this.logger.log(`Fetched ${ratings.length} ratings by user ${userId}`),
      ),
      catchError((error) => {
        this.logger.error(`Error fetching ratings by user ${userId}`, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get a specific rating
   */
  findOne$(id: number): Observable<Rating> {
    return from(
      this.ratingRepository.findOne({
        where: { id },
        relations: ['user', 'movie'],
      }),
    ).pipe(
      switchMap((rating) => {
        if (!rating) {
          return throwError(
            () => new NotFoundException(`Rating with ID ${id} not found`),
          );
        }
        return of(rating);
      }),
      tap((rating) =>
        this.logger.log(`Fetched rating ${id}: ${rating.rating}`),
      ),
      catchError((error) => {
        this.logger.error(`Error fetching rating ${id}`, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get user's rating for a specific movie
   */
  findUserRatingForMovie$(
    userId: number,
    movieId: number,
  ): Observable<Rating | null> {
    return from(
      this.ratingRepository.findOne({
        where: { userId, movieId },
      }),
    ).pipe(
      tap((rating) => {
        if (rating) {
          this.logger.log(
            `Fetched user ${userId}'s rating for movie ${movieId}: ${rating.rating}`,
          );
        }
      }),
      catchError((error) => {
        this.logger.error(
          `Error fetching user ${userId}'s rating for movie ${movieId}`,
          error,
        );
        return of(null);
      }),
    );
  }

  /**
   * Update a rating
   */
  update$(
    id: number,
    userId: number,
    updateRatingDto: UpdateRatingDto,
  ): Observable<Rating> {
    return this.findOne$(id).pipe(
      switchMap((rating) => {
        if (rating.userId !== userId) {
          return throwError(
            () => new Error('You can only update your own ratings'),
          );
        }

        if (updateRatingDto.rating !== undefined) {
          rating.rating = updateRatingDto.rating;
        }
        if (updateRatingDto.review !== undefined) {
          rating.review = updateRatingDto.review;
        }

        return from(this.ratingRepository.save(rating));
      }),
      // Update movie's user rating statistics
      switchMap((rating) =>
        this.moviesService.updateRatingStatistics$(rating.movieId).pipe(
          map(() => rating),
        ),
      ),
      tap((rating) =>
        this.logger.log(`Updated rating ${id}: ${rating.rating}`),
      ),
      catchError((error) => {
        this.logger.error(`Error updating rating ${id}`, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Delete a rating
   */
  remove$(id: number, userId: number): Observable<void> {
    return this.findOne$(id).pipe(
      switchMap((rating) => {
        if (rating.userId !== userId) {
          return throwError(
            () => new Error('You can only delete your own ratings'),
          );
        }

        const movieId = rating.movieId;
        return from(this.ratingRepository.remove(rating)).pipe(
          // Update movie's user rating statistics after deletion
          switchMap(() =>
            this.moviesService.updateRatingStatistics$(movieId),
          ),
          map(() => void 0),
        );
      }),
      tap(() => this.logger.log(`Removed rating ${id}`)),
      catchError((error) => {
        this.logger.error(`Error removing rating ${id}`, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get rating statistics for a movie using RxJS operators
   */
  getMovieRatingStats$(movieId: number): Observable<RatingStatsDto> {
    return this.findByMovie$(movieId).pipe(
      map((ratings) => {
        if (ratings.length === 0) {
          return {
            average: 0,
            count: 0,
            distribution: {},
          };
        }

        // Calculate average
        const sum = ratings.reduce((acc, r) => acc + Number(r.rating), 0);
        const average = sum / ratings.length;

        // Calculate distribution
        const distribution = ratings.reduce((acc, rating) => {
          const key = Math.floor(Number(rating.rating)).toString();
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return {
          average: Math.round(average * 10) / 10,
          count: ratings.length,
          distribution,
        };
      }),
      tap((stats) =>
        this.logger.log(
          `Movie ${movieId} rating stats: ${stats.average} (${stats.count} ratings)`,
        ),
      ),
      catchError((error) => {
        this.logger.error(
          `Error calculating rating stats for movie ${movieId}`,
          error,
        );
        return of({ average: 0, count: 0, distribution: {} });
      }),
    );
  }

  /**
   * Get top-rated movies by users using functional composition
   */
  getTopRatedMovies$(limit: number = 10): Observable<Movie[]> {
    return from(
      this.movieRepository
        .createQueryBuilder('movie')
        .where('movie.userRatingCount > 0')
        .orderBy('movie.userRatingAverage', 'DESC')
        .addOrderBy('movie.userRatingCount', 'DESC')
        .limit(limit)
        .getMany(),
    ).pipe(
      tap((movies) =>
        this.logger.log(`Fetched ${movies.length} top-rated movies`),
      ),
      catchError((error) => {
        this.logger.error('Error fetching top-rated movies', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Batch rate multiple movies
   */
  batchRate$(
    userId: number,
    ratings: { movieId: number; rating: number; review?: string }[],
  ): Observable<Rating[]> {
    return from(ratings).pipe(
      mergeMap(
        ({ movieId, rating, review }) =>
          this.createOrUpdate$(userId, movieId, { rating, review }).pipe(
            catchError((error) => {
              this.logger.error(
                `Failed to rate movie ${movieId}`,
                error,
              );
              return of(null);
            }),
          ),
        3, // Process 3 ratings concurrently
      ),
      toArray(),
      map((results) => results.filter((r): r is Rating => r !== null)),
      tap((savedRatings) =>
        this.logger.log(
          `Batch rated ${savedRatings.length} movies for user ${userId}`,
        ),
      ),
    );
  }

  /**
   * Get average rating across all user ratings
   */
  getOverallAverageRating$(): Observable<number> {
    return from(
      this.ratingRepository
        .createQueryBuilder('rating')
        .select('AVG(rating.rating)', 'average')
        .getRawOne(),
    ).pipe(
      map((result) => result?.average || 0),
      map((average) => Math.round(average * 10) / 10),
      tap((average) =>
        this.logger.log(`Overall average rating: ${average}`),
      ),
      catchError((error) => {
        this.logger.error('Error calculating overall average rating', error);
        return of(0);
      }),
    );
  }
}