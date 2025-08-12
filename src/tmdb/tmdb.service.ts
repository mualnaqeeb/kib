import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import {
  Observable,
  from,
  of,
  throwError,
  timer,
  forkJoin,
  EMPTY,
} from 'rxjs';
import {
  map,
  catchError,
  retry,
  tap,
  mergeMap,
  concatMap,
  delay,
  retryWhen,
  scan,
  filter,
  take,
  expand,
  reduce,
  switchMap,
} from 'rxjs/operators';
import { AxiosResponse } from 'axios';

export interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  original_language: string;
  original_title: string;
  adult: boolean;
  video: boolean;
}

export interface TmdbMovieDetails extends TmdbMovie {
  genres: { id: number; name: string }[];
  runtime: number;
  budget: number;
  revenue: number;
  status: string;
  tagline: string;
  production_companies: any[];
}

export interface TmdbResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

@Injectable()
export class TmdbService {
  private readonly logger = new Logger(TmdbService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('tmdb.apiKey') || '';
    this.baseUrl = this.configService.get<string>('tmdb.baseUrl') || 'https://api.themoviedb.org/3';
  }

  /**
   * Fetch popular movies with functional RxJS approach
   */
  getPopularMovies$(page: number = 1): Observable<TmdbResponse<TmdbMovie>> {
    return this.httpService
      .get<TmdbResponse<TmdbMovie>>(`${this.baseUrl}/movie/popular`, {
        params: {
          api_key: this.apiKey,
          page,
        },
      })
      .pipe(
        map((response: AxiosResponse) => response.data),
        tap((data) =>
          this.logger.log(`Fetched ${data.results.length} popular movies`),
        ),
        retry({
          count: 3,
          delay: (error, retryCount) => {
            this.logger.warn(`Retry attempt ${retryCount} for popular movies`);
            return timer(1000 * retryCount);
          },
        }),
        catchError((error) => {
          this.logger.error('Error fetching popular movies', error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Fetch top-rated movies
   */
  getTopRatedMovies$(page: number = 1): Observable<TmdbResponse<TmdbMovie>> {
    return this.httpService
      .get<TmdbResponse<TmdbMovie>>(`${this.baseUrl}/movie/top_rated`, {
        params: {
          api_key: this.apiKey,
          page,
        },
      })
      .pipe(
        map((response: AxiosResponse) => response.data),
        tap((data) =>
          this.logger.log(`Fetched ${data.results.length} top-rated movies`),
        ),
        retry({
          count: 3,
          delay: (error, retryCount) => timer(1000 * retryCount),
        }),
        catchError((error) => {
          this.logger.error('Error fetching top-rated movies', error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Fetch now playing movies
   */
  getNowPlayingMovies$(
    page: number = 1,
  ): Observable<TmdbResponse<TmdbMovie>> {
    return this.httpService
      .get<TmdbResponse<TmdbMovie>>(`${this.baseUrl}/movie/now_playing`, {
        params: {
          api_key: this.apiKey,
          page,
        },
      })
      .pipe(
        map((response: AxiosResponse) => response.data),
        tap((data) =>
          this.logger.log(
            `Fetched ${data.results.length} now playing movies`,
          ),
        ),
        retry({
          count: 3,
          delay: (error, retryCount) => timer(1000 * retryCount),
        }),
        catchError((error) => {
          this.logger.error('Error fetching now playing movies', error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Fetch upcoming movies
   */
  getUpcomingMovies$(page: number = 1): Observable<TmdbResponse<TmdbMovie>> {
    return this.httpService
      .get<TmdbResponse<TmdbMovie>>(`${this.baseUrl}/movie/upcoming`, {
        params: {
          api_key: this.apiKey,
          page,
        },
      })
      .pipe(
        map((response: AxiosResponse) => response.data),
        tap((data) =>
          this.logger.log(`Fetched ${data.results.length} upcoming movies`),
        ),
        retry({
          count: 3,
          delay: (error, retryCount) => timer(1000 * retryCount),
        }),
        catchError((error) => {
          this.logger.error('Error fetching upcoming movies', error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Get movie details by ID
   */
  getMovieDetails$(movieId: number): Observable<TmdbMovieDetails> {
    return this.httpService
      .get<TmdbMovieDetails>(`${this.baseUrl}/movie/${movieId}`, {
        params: {
          api_key: this.apiKey,
        },
      })
      .pipe(
        map((response: AxiosResponse) => response.data),
        tap((movie) =>
          this.logger.log(`Fetched details for movie: ${movie.title}`),
        ),
        retry({
          count: 3,
          delay: (error, retryCount) => timer(1000 * retryCount),
        }),
        catchError((error) => {
          this.logger.error(`Error fetching movie ${movieId} details`, error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Search movies by query
   */
  searchMovies$(
    query: string,
    page: number = 1,
  ): Observable<TmdbResponse<TmdbMovie>> {
    return this.httpService
      .get<TmdbResponse<TmdbMovie>>(`${this.baseUrl}/search/movie`, {
        params: {
          api_key: this.apiKey,
          query,
          page,
        },
      })
      .pipe(
        map((response: AxiosResponse) => response.data),
        tap((data) =>
          this.logger.log(
            `Found ${data.total_results} movies for query: ${query}`,
          ),
        ),
        retry({
          count: 3,
          delay: (error, retryCount) => timer(1000 * retryCount),
        }),
        catchError((error) => {
          this.logger.error(`Error searching movies for query: ${query}`, error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Discover movies with filters
   */
  discoverMovies$(params: any): Observable<TmdbResponse<TmdbMovie>> {
    return this.httpService
      .get<TmdbResponse<TmdbMovie>>(`${this.baseUrl}/discover/movie`, {
        params: {
          api_key: this.apiKey,
          ...params,
        },
      })
      .pipe(
        map((response: AxiosResponse) => response.data),
        tap((data) =>
          this.logger.log(`Discovered ${data.results.length} movies`),
        ),
        retry({
          count: 3,
          delay: (error, retryCount) => timer(1000 * retryCount),
        }),
        catchError((error) => {
          this.logger.error('Error discovering movies', error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Get all movie genres
   */
  getGenres$(): Observable<TmdbGenre[]> {
    return this.httpService
      .get<{ genres: TmdbGenre[] }>(`${this.baseUrl}/genre/movie/list`, {
        params: {
          api_key: this.apiKey,
        },
      })
      .pipe(
        map((response: AxiosResponse) => response.data.genres),
        tap((genres) => this.logger.log(`Fetched ${genres.length} genres`)),
        retry({
          count: 3,
          delay: (error, retryCount) => timer(1000 * retryCount),
        }),
        catchError((error) => {
          this.logger.error('Error fetching genres', error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Fetch all pages of a given endpoint using expand operator
   * Functional approach with RxJS
   */
  fetchAllPages$<T>(
    fetchFn: (page: number) => Observable<TmdbResponse<T>>,
    maxPages: number = 5,
  ): Observable<T[]> {
    return of(1).pipe(
      expand((page) =>
        page <= maxPages
          ? fetchFn(page).pipe(
              map((response) => page + 1),
              catchError(() => EMPTY),
            )
          : EMPTY,
      ),
      take(maxPages),
      concatMap((page) => fetchFn(page)),
      map((response) => response.results),
      reduce((acc, results) => [...acc, ...results], [] as T[]),
    );
  }

  /**
   * Fetch multiple movie categories in parallel
   */
  fetchMultipleCategories$(
    pages: number = 1,
  ): Observable<{
    popular: TmdbMovie[];
    topRated: TmdbMovie[];
    nowPlaying: TmdbMovie[];
    upcoming: TmdbMovie[];
  }> {
    return forkJoin({
      popular: this.fetchAllPages$(
        (page) => this.getPopularMovies$(page),
        pages,
      ),
      topRated: this.fetchAllPages$(
        (page) => this.getTopRatedMovies$(page),
        pages,
      ),
      nowPlaying: this.fetchAllPages$(
        (page) => this.getNowPlayingMovies$(page),
        pages,
      ),
      upcoming: this.fetchAllPages$(
        (page) => this.getUpcomingMovies$(page),
        pages,
      ),
    }).pipe(
      tap((results) =>
        this.logger.log(
          `Fetched ${
            results.popular.length +
            results.topRated.length +
            results.nowPlaying.length +
            results.upcoming.length
          } total movies from all categories`,
        ),
      ),
    );
  }

  /**
   * Sync movies with rate limiting
   */
  syncMoviesWithDetails$(
    movieIds: number[],
    delayMs: number = 250,
  ): Observable<TmdbMovieDetails[]> {
    return from(movieIds).pipe(
      concatMap((id) =>
        this.getMovieDetails$(id).pipe(
          delay(delayMs), // Rate limiting
          catchError((error) => {
            this.logger.error(`Failed to fetch movie ${id}`, error);
            return of(null);
          }),
        ),
      ),
      filter((movie): movie is TmdbMovieDetails => movie !== null),
      scan((acc, movie) => [...acc, movie], [] as TmdbMovieDetails[]),
      tap((movies) =>
        this.logger.log(`Synced ${movies.length} movies with details`),
      ),
    );
  }
}