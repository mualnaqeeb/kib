import { Test, TestingModule } from '@nestjs/testing';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { CreateMovieDto, QueryMovieDto, UpdateMovieDto } from './dto';
import { of, throwError } from 'rxjs';
import { NotFoundException } from '@nestjs/common';

describe('MoviesController', () => {
  let controller: MoviesController;
  let service: MoviesService;

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
    genres: [{ id: 28, name: 'Action' }],
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

  const mockPaginatedResponse = {
    data: [mockMovie],
    meta: {
      page: 1,
      limit: 20,
      totalItems: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    },
  };

  const mockMoviesService = {
    create$: jest.fn(),
    findAll$: jest.fn(),
    findOne$: jest.fn(),
    update$: jest.fn(),
    remove$: jest.fn(),
    search$: jest.fn(),
    findByGenre$: jest.fn(),
    findByTmdbId$: jest.fn(),
    syncFromTmdb$: jest.fn(),
    batchCreate$: jest.fn(),
    getTrending$: jest.fn(),
    getTopRated$: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MoviesController],
      providers: [
        {
          provide: MoviesService,
          useValue: mockMoviesService,
        },
      ],
    })
      .overrideInterceptor(CacheInterceptor)
      .useValue({ intercept: jest.fn() })
      .compile();

    controller = module.get<MoviesController>(MoviesController);
    service = module.get<MoviesService>(MoviesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new movie', (done) => {
      const createMovieDto: CreateMovieDto = {
        tmdbId: 123,
        title: 'Test Movie',
      };

      mockMoviesService.create$.mockReturnValue(of(mockMovie));

      controller.create(createMovieDto).subscribe({
        next: (result) => {
          expect(result).toEqual(mockMovie);
          expect(mockMoviesService.create$).toHaveBeenCalledWith(createMovieDto);
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated movies', (done) => {
      const query: QueryMovieDto = {
        page: 1,
        limit: 20,
      };

      mockMoviesService.findAll$.mockReturnValue(of(mockPaginatedResponse));

      controller.findAll(query).subscribe({
        next: (result) => {
          expect(result).toEqual(mockPaginatedResponse);
          expect(mockMoviesService.findAll$).toHaveBeenCalledWith(query);
          done();
        },
        error: done.fail,
      });
    });

    it('should apply filters when provided', (done) => {
      const query: QueryMovieDto = {
        page: 1,
        limit: 20,
        search: 'Test',
        genreIds: [28],
        yearFrom: 2020,
        yearTo: 2024,
      };

      mockMoviesService.findAll$.mockReturnValue(of(mockPaginatedResponse));

      controller.findAll(query).subscribe({
        next: (result) => {
          expect(result).toEqual(mockPaginatedResponse);
          expect(mockMoviesService.findAll$).toHaveBeenCalledWith(query);
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('getTrending', () => {
    it('should return trending movies', (done) => {
      mockMoviesService.getTrending$.mockReturnValue(of([mockMovie]));

      controller.getTrending(10).subscribe({
        next: (result) => {
          expect(result).toEqual([mockMovie]);
          expect(mockMoviesService.getTrending$).toHaveBeenCalledWith(10);
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('getTopRated', () => {
    it('should return top-rated movies', (done) => {
      mockMoviesService.getTopRated$.mockReturnValue(of([mockMovie]));

      controller.getTopRated(10).subscribe({
        next: (result) => {
          expect(result).toEqual([mockMovie]);
          expect(mockMoviesService.getTopRated$).toHaveBeenCalledWith(10);
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('search', () => {
    it('should search movies by query', (done) => {
      mockMoviesService.search$.mockReturnValue(of(mockPaginatedResponse));

      controller.search('Test', 1, 20).subscribe({
        next: (result) => {
          expect(result).toEqual(mockPaginatedResponse);
          expect(mockMoviesService.search$).toHaveBeenCalledWith('Test', 1, 20);
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('findByGenre', () => {
    it('should return movies by genre', (done) => {
      mockMoviesService.findByGenre$.mockReturnValue(of(mockPaginatedResponse));

      controller.findByGenre(28, 1, 20).subscribe({
        next: (result) => {
          expect(result).toEqual(mockPaginatedResponse);
          expect(mockMoviesService.findByGenre$).toHaveBeenCalledWith(28, 1, 20);
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('findByTmdbId', () => {
    it('should return movie by TMDB ID', (done) => {
      mockMoviesService.findByTmdbId$.mockReturnValue(of(mockMovie));

      controller.findByTmdbId(123).subscribe({
        next: (result) => {
          expect(result).toEqual(mockMovie);
          expect(mockMoviesService.findByTmdbId$).toHaveBeenCalledWith(123);
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('syncFromTmdb', () => {
    it('should sync movie from TMDB', (done) => {
      mockMoviesService.syncFromTmdb$.mockReturnValue(of(mockMovie));

      controller.syncFromTmdb(123).subscribe({
        next: (result) => {
          expect(result).toEqual(mockMovie);
          expect(mockMoviesService.syncFromTmdb$).toHaveBeenCalledWith(123);
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('batchCreate', () => {
    it('should create multiple movies', (done) => {
      const createMoviesDto: CreateMovieDto[] = [
        { tmdbId: 123, title: 'Movie 1' },
        { tmdbId: 124, title: 'Movie 2' },
      ];

      mockMoviesService.batchCreate$.mockReturnValue(of([mockMovie]));

      controller.batchCreate(createMoviesDto).subscribe({
        next: (result) => {
          expect(result).toEqual([mockMovie]);
          expect(mockMoviesService.batchCreate$).toHaveBeenCalledWith(createMoviesDto);
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('findOne', () => {
    it('should return a movie by ID', (done) => {
      mockMoviesService.findOne$.mockReturnValue(of(mockMovie));

      controller.findOne(1).subscribe({
        next: (result) => {
          expect(result).toEqual(mockMovie);
          expect(mockMoviesService.findOne$).toHaveBeenCalledWith(1);
          done();
        },
        error: done.fail,
      });
    });

    it('should handle movie not found', (done) => {
      mockMoviesService.findOne$.mockReturnValue(
        throwError(() => new NotFoundException()),
      );

      controller.findOne(999).subscribe({
        next: () => done.fail('Should have thrown NotFoundException'),
        error: (error) => {
          expect(error).toBeInstanceOf(NotFoundException);
          done();
        },
      });
    });
  });

  describe('update', () => {
    it('should update a movie', (done) => {
      const updateMovieDto: UpdateMovieDto = {
        title: 'Updated Title',
      };

      mockMoviesService.update$.mockReturnValue(
        of({ ...mockMovie, title: 'Updated Title' }),
      );

      controller.update(1, updateMovieDto).subscribe({
        next: (result) => {
          expect(result.title).toBe('Updated Title');
          expect(mockMoviesService.update$).toHaveBeenCalledWith(1, updateMovieDto);
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('remove', () => {
    it('should remove a movie', (done) => {
      mockMoviesService.remove$.mockReturnValue(of(void 0));

      controller.remove(1).subscribe({
        next: () => {
          expect(mockMoviesService.remove$).toHaveBeenCalledWith(1);
          done();
        },
        error: done.fail,
      });
    });
  });
});