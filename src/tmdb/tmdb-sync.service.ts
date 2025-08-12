import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TmdbService, TmdbMovie, TmdbMovieDetails } from './tmdb.service';
import { Movie } from '../entities/movie.entity';
import { Genre } from '../entities/genre.entity';
import {
  Observable,
  from,
  of,
  forkJoin,
  timer,
  EMPTY,
  throwError,
} from 'rxjs';
import {
  map,
  mergeMap,
  concatMap,
  tap,
  catchError,
  delay,
  filter,
  take,
  toArray,
  switchMap,
  retry,
} from 'rxjs/operators';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TmdbSyncService implements OnModuleInit {
  private readonly logger = new Logger(TmdbSyncService.name);

  constructor(
    private readonly tmdbService: TmdbService,
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
  ) {}

  async onModuleInit() {
    // Initial sync on application startup
    this.logger.log('Starting initial TMDB data sync...');
    await this.syncGenres().toPromise();
    await this.syncInitialMovies().toPromise();
  }

  /**
   * Sync genres from TMDB
   */
  syncGenres(): Observable<Genre[]> {
    return this.tmdbService.getGenres$().pipe(
      switchMap((tmdbGenres) =>
        from(tmdbGenres).pipe(
          concatMap((tmdbGenre) =>
            from(
              this.genreRepository.upsert(
                {
                  id: tmdbGenre.id,
                  name: tmdbGenre.name,
                },
                ['id'],
              ),
            ),
          ),
          toArray(),
          switchMap(() => from(this.genreRepository.find())),
        ),
      ),
      tap((genres) =>
        this.logger.log(`Synchronized ${genres.length} genres`),
      ),
      catchError((error) => {
        this.logger.error('Error syncing genres', error);
        return of([]);
      }),
    );
  }

  /**
   * Initial sync to populate database
   */
  syncInitialMovies(): Observable<void> {
    return this.tmdbService.fetchMultipleCategories$(3).pipe(
      map((categories) => {
        // Combine and deduplicate movies
        const movieMap = new Map<number, TmdbMovie>();
        [...categories.popular, ...categories.topRated, ...categories.nowPlaying, ...categories.upcoming]
          .forEach((movie) => movieMap.set(movie.id, movie));
        return Array.from(movieMap.values());
      }),
      switchMap((movies) =>
        from(movies).pipe(
          concatMap((tmdbMovie) =>
            this.saveMovie(tmdbMovie).pipe(
              delay(100), // Rate limiting
              catchError((error) => {
                this.logger.error(
                  `Error saving movie ${tmdbMovie.id}`,
                  error,
                );
                return of(null);
              }),
            ),
          ),
          toArray(),
        ),
      ),
      tap((savedMovies) =>
        this.logger.log(
          `Initial sync completed. Saved ${
            savedMovies.filter((m) => m !== null).length
          } movies`,
        ),
      ),
      map(() => void 0),
    );
  }

  /**
   * Save or update a movie with functional composition
   */
  saveMovie(tmdbMovie: TmdbMovie | TmdbMovieDetails): Observable<Movie> {
    return from(
      this.movieRepository.findOne({ where: { tmdbId: tmdbMovie.id } }),
    ).pipe(
      switchMap((existingMovie) => {
        const movieData: Partial<Movie> = {
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
          originalLanguage: tmdbMovie.original_language,
          originalTitle: tmdbMovie.original_title,
          adult: tmdbMovie.adult,
          video: tmdbMovie.video,
        };

        // If it's a detailed movie, add genres
        if ('genres' in tmdbMovie) {
          movieData.genres = tmdbMovie.genres;
        }

        if (existingMovie) {
          // Update existing movie, preserve user ratings
          return from(
            this.movieRepository.save({
              ...existingMovie,
              ...movieData,
              // Preserve user rating data
              userRatingAverage: existingMovie.userRatingAverage,
              userRatingCount: existingMovie.userRatingCount,
            }),
          );
        } else {
          // Create new movie
          return from(
            this.movieRepository.save(
              this.movieRepository.create(movieData),
            ),
          );
        }
      }),
      tap((movie) =>
        this.logger.debug(`Saved/Updated movie: ${movie.title}`),
      ),
    );
  }

  /**
   * Sync popular movies every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  syncPopularMovies(): Observable<void> {
    this.logger.log('Starting scheduled popular movies sync...');
    return this.tmdbService.getPopularMovies$(1).pipe(
      switchMap((response) =>
        from(response.results).pipe(
          concatMap((movie) =>
            this.saveMovie(movie).pipe(
              delay(100),
              catchError((error) => {
                this.logger.error(`Error syncing movie ${movie.id}`, error);
                return of(null);
              }),
            ),
          ),
          toArray(),
        ),
      ),
      tap((movies) =>
        this.logger.log(
          `Synced ${movies.filter((m) => m !== null).length} popular movies`,
        ),
      ),
      map(() => void 0),
    );
  }

  /**
   * Sync movie details with enriched data
   */
  syncMovieDetails(movieId: number): Observable<Movie> {
    return this.tmdbService.getMovieDetails$(movieId).pipe(
      switchMap((movieDetails) => this.saveMovie(movieDetails)),
      tap((movie) =>
        this.logger.log(`Synced detailed data for movie: ${movie.title}`),
      ),
      catchError((error) => {
        this.logger.error(`Error syncing movie details ${movieId}`, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Batch sync movies by IDs
   */
  batchSyncMovies(movieIds: number[]): Observable<Movie[]> {
    return from(movieIds).pipe(
      concatMap((id) =>
        this.syncMovieDetails(id).pipe(
          delay(250), // Rate limiting
          catchError(() => of(null)),
        ),
      ),
      filter((movie): movie is Movie => movie !== null),
      toArray(),
      tap((movies) =>
        this.logger.log(`Batch synced ${movies.length} movies`),
      ),
    );
  }
}