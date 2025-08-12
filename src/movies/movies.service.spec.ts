import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { MoviesService } from './movies.service';
import { Movie } from '../entities/movie.entity';
import { TmdbService } from '../tmdb/tmdb.service';
import { CreateMovieDto, QueryMovieDto, SortBy, SortOrder } from './dto';
import { of, throwError } from 'rxjs';

describe('MoviesService', () => {
  let service: MoviesService;
  let movieRepository: Repository<Movie>;
  let tmdbService: TmdbService;

  const mockMovie: Movie = {
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
    genres: [{ id: 28, name: 'Action' }, { id: 12, name: 'Adventure' }],
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

  const mockMovieRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockTmdbService = {
    getMovieDetails$: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoviesService,
        {
          provide: getRepositoryToken(Movie),
          useValue: mockMovieRepository,
        },
        {
          provide: TmdbService,
          useValue: mockTmdbService,
        },
      ],
    }).compile();

    service = module.get<MoviesService>(MoviesService);
    movieRepository = module.get<Repository<Movie>>(getRepositoryToken(Movie));
    tmdbService = module.get<TmdbService>(TmdbService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create$', () => {
    it('should create a new movie', (done) => {
      const createMovieDto: CreateMovieDto = {
        tmdbId: 123,
        title: 'Test Movie',
        overview: 'Test overview',
        releaseDate: '2024-01-01',
      };

      mockMovieRepository.findOne.mockResolvedValue(null);
      mockMovieRepository.create.mockReturnValue(mockMovie);
      mockMovieRepository.save.mockResolvedValue(mockMovie);

      service.create$(createMovieDto).subscribe({
        next: (result) => {
          expect(result).toEqual(mockMovie);
          expect(mockMovieRepository.findOne).toHaveBeenCalledWith({
            where: { tmdbId: createMovieDto.tmdbId },
          });
          expect(mockMovieRepository.create).toHaveBeenCalled();
          expect(mockMovieRepository.save).toHaveBeenCalled();
          done();
        },
        error: done.fail,
      });
    });

    it('should throw error if movie already exists', (done) => {
      const createMovieDto: CreateMovieDto = {
        tmdbId: 123,
        title: 'Test Movie',
      };

      mockMovieRepository.findOne.mockResolvedValue(mockMovie);

      service.create$(createMovieDto).subscribe({
        next: () => done.fail('Should have thrown an error'),
        error: (error) => {
          expect(error.message).toContain('already exists');
          done();
        },
      });
    });
  });

  describe('findAll$', () => {
    it('should return paginated movies', (done) => {
      const query: QueryMovieDto = {
        page: 1,
        limit: 20,
        sortBy: SortBy.POPULARITY,
        sortOrder: SortOrder.DESC,
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockMovie], 1]),
      };

      mockMovieRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      service.findAll$(query).subscribe({
        next: (result) => {
          expect(result.data).toEqual([mockMovie]);
          expect(result.meta.totalItems).toBe(1);
          expect(result.meta.page).toBe(1);
          expect(result.meta.limit).toBe(20);
          done();
        },
        error: done.fail,
      });
    });

    it('should apply search filter', (done) => {
      const query: QueryMovieDto = {
        page: 1,
        limit: 20,
        search: 'Test',
        sortBy: SortBy.TITLE,
        sortOrder: SortOrder.ASC,
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockMovie], 1]),
      };

      mockMovieRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      service.findAll$(query).subscribe({
        next: () => {
          expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
            expect.stringContaining('ILIKE'),
            expect.objectContaining({ search: '%Test%' }),
          );
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('findOne$', () => {
    it('should return a movie by id', (done) => {
      mockMovieRepository.findOne.mockResolvedValue(mockMovie);

      service.findOne$(1).subscribe({
        next: (result) => {
          expect(result).toEqual(mockMovie);
          expect(mockMovieRepository.findOne).toHaveBeenCalledWith({
            where: { id: 1 },
            relations: ['ratings'],
          });
          done();
        },
        error: done.fail,
      });
    });

    it('should throw NotFoundException if movie not found', (done) => {
      mockMovieRepository.findOne.mockResolvedValue(null);

      service.findOne$(999).subscribe({
        next: () => done.fail('Should have thrown NotFoundException'),
        error: (error) => {
          expect(error).toBeInstanceOf(NotFoundException);
          done();
        },
      });
    });
  });

  describe('findByTmdbId$', () => {
    it('should return existing movie by TMDB ID', (done) => {
      mockMovieRepository.findOne.mockResolvedValue(mockMovie);

      service.findByTmdbId$(123).subscribe({
        next: (result) => {
          expect(result).toEqual(mockMovie);
          expect(mockMovieRepository.findOne).toHaveBeenCalledWith({
            where: { tmdbId: 123 },
            relations: ['ratings'],
          });
          done();
        },
        error: done.fail,
      });
    });

    it('should fetch from TMDB if movie not found locally', (done) => {
      const tmdbMovie = {
        id: 123,
        title: 'TMDB Movie',
        overview: 'TMDB overview',
        poster_path: '/tmdb-poster.jpg',
        backdrop_path: '/tmdb-backdrop.jpg',
        release_date: '2024-01-01',
        vote_average: 7.5,
        vote_count: 500,
        popularity: 80,
        genre_ids: [28],
        genres: [{ id: 28, name: 'Action' }],
        original_language: 'en',
        original_title: 'TMDB Movie',
        adult: false,
        video: false,
        runtime: 120,
        budget: 1000000,
        revenue: 5000000,
        status: 'Released',
        tagline: 'Test tagline',
        production_companies: [],
      };

      mockMovieRepository.findOne.mockResolvedValue(null);
      mockTmdbService.getMovieDetails$.mockReturnValue(of(tmdbMovie));
      mockMovieRepository.create.mockReturnValue(mockMovie);
      mockMovieRepository.save.mockResolvedValue(mockMovie);

      service.findByTmdbId$(123).subscribe({
        next: (result) => {
          expect(result).toEqual(mockMovie);
          expect(mockTmdbService.getMovieDetails$).toHaveBeenCalledWith(123);
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('update$', () => {
    it('should update a movie', (done) => {
      const updateDto = { title: 'Updated Title' };
      const updatedMovie = { ...mockMovie, title: 'Updated Title' };

      mockMovieRepository.findOne.mockResolvedValue(mockMovie);
      mockMovieRepository.save.mockResolvedValue(updatedMovie);

      service.update$(1, updateDto).subscribe({
        next: (result) => {
          expect(result.title).toBe('Updated Title');
          expect(mockMovieRepository.save).toHaveBeenCalled();
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('remove$', () => {
    it('should remove a movie', (done) => {
      mockMovieRepository.findOne.mockResolvedValue(mockMovie);
      mockMovieRepository.remove.mockResolvedValue(mockMovie);

      service.remove$(1).subscribe({
        next: () => {
          expect(mockMovieRepository.remove).toHaveBeenCalledWith(mockMovie);
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('search$', () => {
    it('should search movies by title', (done) => {
      mockMovieRepository.findAndCount.mockResolvedValue([[mockMovie], 1]);

      service.search$('Test', 1, 20).subscribe({
        next: (result) => {
          expect(result.data).toEqual([mockMovie]);
          expect(mockMovieRepository.findAndCount).toHaveBeenCalledWith(
            expect.objectContaining({
              where: expect.objectContaining({ title: expect.anything() }),
              skip: 0,
              take: 20,
            }),
          );
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('getTopRated$', () => {
    it('should return top-rated movies', (done) => {
      mockMovieRepository.find.mockResolvedValue([mockMovie]);

      service.getTopRated$(10).subscribe({
        next: (result) => {
          expect(result).toEqual([mockMovie]);
          expect(mockMovieRepository.find).toHaveBeenCalledWith(
            expect.objectContaining({
              order: expect.objectContaining({
                userRatingAverage: 'DESC',
                userRatingCount: 'DESC',
              }),
              take: 10,
            }),
          );
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('getTrending$', () => {
    it('should return trending movies', (done) => {
      mockMovieRepository.find.mockResolvedValue([mockMovie]);

      service.getTrending$(10).subscribe({
        next: (result) => {
          expect(result).toEqual([mockMovie]);
          expect(mockMovieRepository.find).toHaveBeenCalledWith(
            expect.objectContaining({
              order: { popularity: 'DESC' },
              take: 10,
            }),
          );
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('updateRatingStatistics$', () => {
    it('should update movie rating statistics', (done) => {
      const mockStats = {
        id: 1,
        avgRating: 8.5,
        ratingCount: 10,
      };

      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockStats),
      };

      mockMovieRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockMovieRepository.update.mockResolvedValue({ affected: 1 });
      mockMovieRepository.findOne.mockResolvedValue({
        ...mockMovie,
        userRatingAverage: 8.5,
        userRatingCount: 10,
      });

      service.updateRatingStatistics$(1).subscribe({
        next: (result) => {
          expect(result.userRatingAverage).toBe(8.5);
          expect(result.userRatingCount).toBe(10);
          expect(mockMovieRepository.update).toHaveBeenCalledWith(1, {
            userRatingAverage: 8.5,
            userRatingCount: 10,
          });
          done();
        },
        error: done.fail,
      });
    });
  });
});