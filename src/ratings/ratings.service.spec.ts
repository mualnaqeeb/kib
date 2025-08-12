import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { Rating } from '../entities/rating.entity';
import { Movie } from '../entities/movie.entity';
import { User } from '../entities/user.entity';
import { MoviesService } from '../movies/movies.service';
import { CreateRatingDto } from './dto';
import { of, throwError } from 'rxjs';

describe('RatingsService', () => {
  let service: RatingsService;
  let ratingRepository: Repository<Rating>;
  let movieRepository: Repository<Movie>;
  let userRepository: Repository<User>;
  let moviesService: MoviesService;

  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    watchlist: [],
    favorites: [],
    ratings: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    hashPassword: jest.fn(),
    validatePassword: jest.fn(),
  };

  const mockMovie = {
    id: 1,
    tmdbId: 123,
    title: 'Test Movie',
    overview: 'Test overview',
    posterPath: '/poster.jpg',
    backdropPath: '/backdrop.jpg',
    releaseDate: new Date('2024-01-01'),
    voteAverage: 8.5,
    voteCount: 1000,
    popularity: 100,
    genreIds: [28, 12],
    genres: [],
    originalLanguage: 'en',
    originalTitle: 'Test Movie',
    adult: false,
    video: false,
    userRatingAverage: 8.0,
    userRatingCount: 50,
    ratings: [],
    watchlistedBy: [],
    favoritedBy: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRating: Rating = {
    id: 1,
    rating: 8.5,
    review: 'Great movie!',
    userId: 1,
    movieId: 1,
    user: mockUser,
    movie: mockMovie,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRatingRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockMovieRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockMoviesService = {
    updateRatingStatistics$: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingsService,
        {
          provide: getRepositoryToken(Rating),
          useValue: mockRatingRepository,
        },
        {
          provide: getRepositoryToken(Movie),
          useValue: mockMovieRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: MoviesService,
          useValue: mockMoviesService,
        },
      ],
    }).compile();

    service = module.get<RatingsService>(RatingsService);
    ratingRepository = module.get<Repository<Rating>>(
      getRepositoryToken(Rating),
    );
    movieRepository = module.get<Repository<Movie>>(
      getRepositoryToken(Movie),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    moviesService = module.get<MoviesService>(MoviesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrUpdate$', () => {
    const createRatingDto: CreateRatingDto = {
      rating: 8.5,
      review: 'Great movie!',
    };

    it('should create a new rating', (done) => {
      mockMovieRepository.findOne.mockResolvedValue(mockMovie);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockRatingRepository.findOne.mockResolvedValue(null);
      mockRatingRepository.create.mockReturnValue(mockRating);
      mockRatingRepository.save.mockResolvedValue(mockRating);
      mockMoviesService.updateRatingStatistics$.mockReturnValue(of(mockMovie));

      service.createOrUpdate$(1, 1, createRatingDto).subscribe({
        next: (result) => {
          expect(result).toEqual(mockRating);
          expect(mockRatingRepository.create).toHaveBeenCalled();
          expect(mockRatingRepository.save).toHaveBeenCalled();
          expect(mockMoviesService.updateRatingStatistics$).toHaveBeenCalledWith(1);
          done();
        },
        error: done.fail,
      });
    });

    it('should update existing rating', (done) => {
      const existingRating = { ...mockRating, rating: 7.0 };
      const updatedRating = { ...existingRating, rating: 8.5 };

      mockMovieRepository.findOne.mockResolvedValue(mockMovie);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockRatingRepository.findOne.mockResolvedValue(existingRating);
      mockRatingRepository.save.mockResolvedValue(updatedRating);
      mockMoviesService.updateRatingStatistics$.mockReturnValue(of(mockMovie));

      service.createOrUpdate$(1, 1, createRatingDto).subscribe({
        next: (result) => {
          expect(result.rating).toBe(8.5);
          expect(mockRatingRepository.save).toHaveBeenCalled();
          expect(mockMoviesService.updateRatingStatistics$).toHaveBeenCalledWith(1);
          done();
        },
        error: done.fail,
      });
    });

    it('should throw NotFoundException if movie not found', (done) => {
      mockMovieRepository.findOne.mockResolvedValue(null);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockRatingRepository.findOne.mockResolvedValue(null);

      service.createOrUpdate$(1, 999, createRatingDto).subscribe({
        next: () => done.fail('Should have thrown NotFoundException'),
        error: (error) => {
          expect(error).toBeInstanceOf(NotFoundException);
          expect(error.message).toContain('Movie');
          done();
        },
      });
    });

    it('should throw NotFoundException if user not found', (done) => {
      mockMovieRepository.findOne.mockResolvedValue(mockMovie);
      mockUserRepository.findOne.mockResolvedValue(null);
      mockRatingRepository.findOne.mockResolvedValue(null);

      service.createOrUpdate$(999, 1, createRatingDto).subscribe({
        next: () => done.fail('Should have thrown NotFoundException'),
        error: (error) => {
          expect(error).toBeInstanceOf(NotFoundException);
          expect(error.message).toContain('User');
          done();
        },
      });
    });
  });

  describe('findByMovie$', () => {
    it('should return all ratings for a movie', (done) => {
      const mockRatings = [mockRating];
      mockRatingRepository.find.mockResolvedValue(mockRatings);

      service.findByMovie$(1).subscribe({
        next: (result) => {
          expect(result).toEqual(mockRatings);
          expect(mockRatingRepository.find).toHaveBeenCalledWith({
            where: { movieId: 1 },
            relations: ['user'],
            order: { createdAt: 'DESC' },
          });
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('findByUser$', () => {
    it('should return all ratings by a user', (done) => {
      const mockRatings = [mockRating];
      mockRatingRepository.find.mockResolvedValue(mockRatings);

      service.findByUser$(1).subscribe({
        next: (result) => {
          expect(result).toHaveLength(1);
          expect(result[0].movieTitle).toBe('Test Movie');
          expect(result[0].rating).toBe(8.5);
          expect(mockRatingRepository.find).toHaveBeenCalledWith({
            where: { userId: 1 },
            relations: ['movie'],
            order: { createdAt: 'DESC' },
          });
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('findOne$', () => {
    it('should return a rating by id', (done) => {
      mockRatingRepository.findOne.mockResolvedValue(mockRating);

      service.findOne$(1).subscribe({
        next: (result) => {
          expect(result).toEqual(mockRating);
          expect(mockRatingRepository.findOne).toHaveBeenCalledWith({
            where: { id: 1 },
            relations: ['user', 'movie'],
          });
          done();
        },
        error: done.fail,
      });
    });

    it('should throw NotFoundException if rating not found', (done) => {
      mockRatingRepository.findOne.mockResolvedValue(null);

      service.findOne$(999).subscribe({
        next: () => done.fail('Should have thrown NotFoundException'),
        error: (error) => {
          expect(error).toBeInstanceOf(NotFoundException);
          done();
        },
      });
    });
  });

  describe('findUserRatingForMovie$', () => {
    it('should return user rating for a movie', (done) => {
      mockRatingRepository.findOne.mockResolvedValue(mockRating);

      service.findUserRatingForMovie$(1, 1).subscribe({
        next: (result) => {
          expect(result).toEqual(mockRating);
          expect(mockRatingRepository.findOne).toHaveBeenCalledWith({
            where: { userId: 1, movieId: 1 },
          });
          done();
        },
        error: done.fail,
      });
    });

    it('should return null if rating not found', (done) => {
      mockRatingRepository.findOne.mockResolvedValue(null);

      service.findUserRatingForMovie$(1, 1).subscribe({
        next: (result) => {
          expect(result).toBeNull();
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('update$', () => {
    it('should update a rating', (done) => {
      const updateDto = { rating: 9.0, review: 'Updated review' };
      const updatedRating = { ...mockRating, ...updateDto };

      mockRatingRepository.findOne.mockResolvedValue(mockRating);
      mockRatingRepository.save.mockResolvedValue(updatedRating);
      mockMoviesService.updateRatingStatistics$.mockReturnValue(of(mockMovie));

      service.update$(1, 1, updateDto).subscribe({
        next: (result) => {
          expect(result.rating).toBe(9.0);
          expect(result.review).toBe('Updated review');
          expect(mockRatingRepository.save).toHaveBeenCalled();
          done();
        },
        error: done.fail,
      });
    });

    it('should throw error if user tries to update another user rating', (done) => {
      const differentUserRating = { ...mockRating, userId: 2 };
      mockRatingRepository.findOne.mockResolvedValue(differentUserRating);

      service.update$(1, 1, { rating: 9.0 }).subscribe({
        next: () => done.fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('only update your own ratings');
          done();
        },
      });
    });
  });

  describe('remove$', () => {
    it('should remove a rating', (done) => {
      mockRatingRepository.findOne.mockResolvedValue(mockRating);
      mockRatingRepository.remove.mockResolvedValue(mockRating);
      mockMoviesService.updateRatingStatistics$.mockReturnValue(of(mockMovie));

      service.remove$(1, 1).subscribe({
        next: () => {
          expect(mockRatingRepository.remove).toHaveBeenCalledWith(mockRating);
          expect(mockMoviesService.updateRatingStatistics$).toHaveBeenCalledWith(1);
          done();
        },
        error: done.fail,
      });
    });

    it('should throw error if user tries to delete another user rating', (done) => {
      const differentUserRating = { ...mockRating, userId: 2 };
      mockRatingRepository.findOne.mockResolvedValue(differentUserRating);

      service.remove$(1, 1).subscribe({
        next: () => done.fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('only delete your own ratings');
          done();
        },
      });
    });
  });

  describe('getMovieRatingStats$', () => {
    it('should calculate rating statistics', (done) => {
      const mockRatings = [
        { ...mockRating, rating: 8 },
        { ...mockRating, rating: 9 },
        { ...mockRating, rating: 7 },
      ];

      mockRatingRepository.find.mockResolvedValue(mockRatings);

      service.getMovieRatingStats$(1).subscribe({
        next: (result) => {
          expect(result.average).toBe(8);
          expect(result.count).toBe(3);
          expect(result.distribution).toBeDefined();
          done();
        },
        error: done.fail,
      });
    });

    it('should return empty stats for movie with no ratings', (done) => {
      mockRatingRepository.find.mockResolvedValue([]);

      service.getMovieRatingStats$(1).subscribe({
        next: (result) => {
          expect(result.average).toBe(0);
          expect(result.count).toBe(0);
          expect(result.distribution).toEqual({});
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('getTopRatedMovies$', () => {
    it('should return top-rated movies', (done) => {
      const mockMovies = [mockMovie];
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockMovies),
      };

      mockMovieRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      service.getTopRatedMovies$(5).subscribe({
        next: (result) => {
          expect(result).toEqual(mockMovies);
          expect(mockQueryBuilder.limit).toHaveBeenCalledWith(5);
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('batchRate$', () => {
    it('should batch rate multiple movies', (done) => {
      const ratings = [
        { movieId: 1, rating: 8, review: 'Good' },
        { movieId: 2, rating: 9, review: 'Great' },
      ];

      mockMovieRepository.findOne.mockResolvedValue(mockMovie);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockRatingRepository.findOne.mockResolvedValue(null);
      mockRatingRepository.create.mockReturnValue(mockRating);
      mockRatingRepository.save.mockResolvedValue(mockRating);
      mockMoviesService.updateRatingStatistics$.mockReturnValue(of(mockMovie));

      service.batchRate$(1, ratings).subscribe({
        next: (result) => {
          expect(result).toHaveLength(2);
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('getOverallAverageRating$', () => {
    it('should calculate overall average rating', (done) => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ average: 8.234 }),
      };

      mockRatingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      service.getOverallAverageRating$().subscribe({
        next: (result) => {
          expect(result).toBe(8.2);
          done();
        },
        error: done.fail,
      });
    });

    it('should return 0 if no ratings exist', (done) => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ average: null }),
      };

      mockRatingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      service.getOverallAverageRating$().subscribe({
        next: (result) => {
          expect(result).toBe(0);
          done();
        },
        error: done.fail,
      });
    });
  });
});