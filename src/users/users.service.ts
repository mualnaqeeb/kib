import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Movie } from '../entities/movie.entity';
import { CreateUserDto, UpdateUserDto } from './dto';
import { Observable, from, of, throwError, forkJoin } from 'rxjs';
import {
  map,
  switchMap,
  tap,
  catchError,
  mergeMap,
  toArray,
} from 'rxjs/operators';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

export interface JwtPayload {
  sub: number;
  username: string;
  email: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Create a new user with RxJS
   */
  create$(createUserDto: CreateUserDto): Observable<User> {
    return forkJoin({
      existingUsername: from(
        this.userRepository.findOne({
          where: { username: createUserDto.username },
        }),
      ),
      existingEmail: from(
        this.userRepository.findOne({
          where: { email: createUserDto.email },
        }),
      ),
    }).pipe(
      switchMap(({ existingUsername, existingEmail }) => {
        if (existingUsername) {
          return throwError(
            () => new ConflictException('Username already exists'),
          );
        }
        if (existingEmail) {
          return throwError(
            () => new ConflictException('Email already exists'),
          );
        }

        const user = this.userRepository.create(createUserDto);
        return from(this.userRepository.save(user));
      }),
      tap((user) =>
        this.logger.log(`Created new user: ${user.username} (${user.email})`),
      ),
      catchError((error) => {
        this.logger.error('Error creating user', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Find all users
   */
  findAll$(): Observable<User[]> {
    return from(
      this.userRepository.find({
        select: ['id', 'username', 'email', 'firstName', 'lastName', 'isActive', 'createdAt'],
      }),
    ).pipe(
      tap((users) => this.logger.log(`Fetched ${users.length} users`)),
      catchError((error) => {
        this.logger.error('Error fetching users', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Find user by ID
   */
  findOne$(id: number): Observable<User> {
    return from(
      this.userRepository.findOne({
        where: { id },
        relations: ['watchlist', 'favorites', 'ratings'],
      }),
    ).pipe(
      switchMap((user) => {
        if (!user) {
          return throwError(
            () => new NotFoundException(`User with ID ${id} not found`),
          );
        }
        return of(user);
      }),
      tap((user) => this.logger.log(`Fetched user: ${user.username}`)),
      catchError((error) => {
        this.logger.error(`Error fetching user ${id}`, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Find user by username or email
   */
  findByUsernameOrEmail$(usernameOrEmail: string): Observable<User> {
    return from(
      this.userRepository
        .createQueryBuilder('user')
        .where('user.username = :value OR user.email = :value', {
          value: usernameOrEmail,
        })
        .getOne(),
    ).pipe(
      switchMap((user) => {
        if (!user) {
          return throwError(
            () => new NotFoundException('User not found'),
          );
        }
        return of(user);
      }),
      catchError((error) => {
        this.logger.error(
          `Error fetching user by username/email: ${usernameOrEmail}`,
          error,
        );
        return throwError(() => error);
      }),
    );
  }

  /**
   * Update user
   */
  update$(id: number, updateUserDto: UpdateUserDto): Observable<User> {
    return this.findOne$(id).pipe(
      switchMap((user) => {
        Object.assign(user, updateUserDto);
        return from(this.userRepository.save(user));
      }),
      tap((user) =>
        this.logger.log(`Updated user: ${user.username}`),
      ),
      catchError((error) => {
        this.logger.error(`Error updating user ${id}`, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Remove user
   */
  remove$(id: number): Observable<void> {
    return this.findOne$(id).pipe(
      switchMap((user) => from(this.userRepository.remove(user))),
      map(() => void 0),
      tap(() => this.logger.log(`Removed user with ID ${id}`)),
      catchError((error) => {
        this.logger.error(`Error removing user ${id}`, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Validate user credentials
   */
  validateUser$(username: string, password: string): Observable<User> {
    return this.findByUsernameOrEmail$(username).pipe(
      switchMap((user) =>
        from(user.validatePassword(password)).pipe(
          map((isValid) => {
            if (!isValid) {
              throw new UnauthorizedException('Invalid credentials');
            }
            return user;
          }),
        ),
      ),
      tap((user) =>
        this.logger.log(`User ${user.username} validated successfully`),
      ),
      catchError((error) => {
        this.logger.error(`Error validating user ${username}`, error);
        return throwError(() => new UnauthorizedException('Invalid credentials'));
      }),
    );
  }

  /**
   * Login user and generate JWT
   */
  login$(username: string, password: string): Observable<AuthResponse> {
    return this.validateUser$(username, password).pipe(
      map((user) => {
        const payload: JwtPayload = {
          sub: user.id,
          username: user.username,
          email: user.email,
        };
        const accessToken = this.jwtService.sign(payload);
        
        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;
        
        return {
          user: userWithoutPassword as User,
          accessToken,
        };
      }),
      tap((response) =>
        this.logger.log(`User ${response.user.username} logged in successfully`),
      ),
      catchError((error) => {
        this.logger.error(`Login failed for ${username}`, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Add movie to watchlist
   */
  addToWatchlist$(userId: number, movieId: number): Observable<User> {
    return forkJoin({
      user: this.findOne$(userId),
      movie: from(this.movieRepository.findOne({ where: { id: movieId } })),
    }).pipe(
      switchMap(({ user, movie }) => {
        if (!movie) {
          return throwError(
            () => new NotFoundException(`Movie with ID ${movieId} not found`),
          );
        }

        // Check if already in watchlist
        const isInWatchlist = user.watchlist?.some((m) => m.id === movieId);
        if (isInWatchlist) {
          return of(user);
        }

        if (!user.watchlist) {
          user.watchlist = [];
        }
        user.watchlist.push(movie);
        return from(this.userRepository.save(user));
      }),
      tap((user) =>
        this.logger.log(
          `Added movie ${movieId} to ${user.username}'s watchlist`,
        ),
      ),
      catchError((error) => {
        this.logger.error(
          `Error adding movie ${movieId} to user ${userId}'s watchlist`,
          error,
        );
        return throwError(() => error);
      }),
    );
  }

  /**
   * Remove movie from watchlist
   */
  removeFromWatchlist$(userId: number, movieId: number): Observable<User> {
    return this.findOne$(userId).pipe(
      switchMap((user) => {
        if (!user.watchlist) {
          return of(user);
        }
        user.watchlist = user.watchlist.filter((m) => m.id !== movieId);
        return from(this.userRepository.save(user));
      }),
      tap((user) =>
        this.logger.log(
          `Removed movie ${movieId} from ${user.username}'s watchlist`,
        ),
      ),
      catchError((error) => {
        this.logger.error(
          `Error removing movie ${movieId} from user ${userId}'s watchlist`,
          error,
        );
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get user's watchlist
   */
  getWatchlist$(userId: number): Observable<Movie[]> {
    return this.findOne$(userId).pipe(
      map((user) => user.watchlist || []),
      tap((watchlist) =>
        this.logger.log(
          `Fetched ${watchlist.length} movies from user ${userId}'s watchlist`,
        ),
      ),
      catchError((error) => {
        this.logger.error(`Error fetching watchlist for user ${userId}`, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Add movie to favorites
   */
  addToFavorites$(userId: number, movieId: number): Observable<User> {
    return forkJoin({
      user: this.findOne$(userId),
      movie: from(this.movieRepository.findOne({ where: { id: movieId } })),
    }).pipe(
      switchMap(({ user, movie }) => {
        if (!movie) {
          return throwError(
            () => new NotFoundException(`Movie with ID ${movieId} not found`),
          );
        }

        // Check if already in favorites
        const isInFavorites = user.favorites?.some((m) => m.id === movieId);
        if (isInFavorites) {
          return of(user);
        }

        if (!user.favorites) {
          user.favorites = [];
        }
        user.favorites.push(movie);
        return from(this.userRepository.save(user));
      }),
      tap((user) =>
        this.logger.log(
          `Added movie ${movieId} to ${user.username}'s favorites`,
        ),
      ),
      catchError((error) => {
        this.logger.error(
          `Error adding movie ${movieId} to user ${userId}'s favorites`,
          error,
        );
        return throwError(() => error);
      }),
    );
  }

  /**
   * Remove movie from favorites
   */
  removeFromFavorites$(userId: number, movieId: number): Observable<User> {
    return this.findOne$(userId).pipe(
      switchMap((user) => {
        if (!user.favorites) {
          return of(user);
        }
        user.favorites = user.favorites.filter((m) => m.id !== movieId);
        return from(this.userRepository.save(user));
      }),
      tap((user) =>
        this.logger.log(
          `Removed movie ${movieId} from ${user.username}'s favorites`,
        ),
      ),
      catchError((error) => {
        this.logger.error(
          `Error removing movie ${movieId} from user ${userId}'s favorites`,
          error,
        );
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get user's favorites
   */
  getFavorites$(userId: number): Observable<Movie[]> {
    return this.findOne$(userId).pipe(
      map((user) => user.favorites || []),
      tap((favorites) =>
        this.logger.log(
          `Fetched ${favorites.length} movies from user ${userId}'s favorites`,
        ),
      ),
      catchError((error) => {
        this.logger.error(`Error fetching favorites for user ${userId}`, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Change user password
   */
  changePassword$(
    userId: number,
    oldPassword: string,
    newPassword: string,
  ): Observable<User> {
    return this.findOne$(userId).pipe(
      switchMap((user) =>
        from(user.validatePassword(oldPassword)).pipe(
          switchMap((isValid) => {
            if (!isValid) {
              return throwError(
                () => new UnauthorizedException('Invalid current password'),
              );
            }
            user.password = newPassword;
            return from(this.userRepository.save(user));
          }),
        ),
      ),
      tap((user) =>
        this.logger.log(`Password changed for user: ${user.username}`),
      ),
      catchError((error) => {
        this.logger.error(`Error changing password for user ${userId}`, error);
        return throwError(() => error);
      }),
    );
  }
}