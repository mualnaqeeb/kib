import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from '../entities/user.entity';
import { Movie } from '../entities/movie.entity';
import { CreateUserDto, UpdateUserDto } from './dto';
import { of, throwError } from 'rxjs';
import * as bcrypt from 'bcrypt';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: Repository<User>;
  let movieRepository: Repository<Movie>;
  let jwtService: JwtService;

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password: '$2b$10$hashedpassword',
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

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockMovieRepository = {
    findOne: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Movie),
          useValue: mockMovieRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    movieRepository = module.get<Repository<Movie>>(getRepositoryToken(Movie));
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create$', () => {
    it('should create a new user', (done) => {
      const createUserDto: CreateUserDto = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      service.create$(createUserDto).subscribe({
        next: (result) => {
          expect(result).toEqual(mockUser);
          expect(mockUserRepository.findOne).toHaveBeenCalledTimes(2);
          expect(mockUserRepository.create).toHaveBeenCalledWith(createUserDto);
          expect(mockUserRepository.save).toHaveBeenCalled();
          done();
        },
        error: done.fail,
      });
    });

    it('should throw ConflictException if username exists', (done) => {
      const createUserDto: CreateUserDto = {
        username: 'existinguser',
        email: 'new@example.com',
        password: 'Password123!',
      };

      mockUserRepository.findOne
        .mockResolvedValueOnce(mockUser) // Username exists
        .mockResolvedValueOnce(null); // Email doesn't exist

      service.create$(createUserDto).subscribe({
        next: () => done.fail('Should have thrown ConflictException'),
        error: (error) => {
          expect(error).toBeInstanceOf(ConflictException);
          expect(error.message).toBe('Username already exists');
          done();
        },
      });
    });

    it('should throw ConflictException if email exists', (done) => {
      const createUserDto: CreateUserDto = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'Password123!',
      };

      mockUserRepository.findOne
        .mockResolvedValueOnce(null) // Username doesn't exist
        .mockResolvedValueOnce(mockUser); // Email exists

      service.create$(createUserDto).subscribe({
        next: () => done.fail('Should have thrown ConflictException'),
        error: (error) => {
          expect(error).toBeInstanceOf(ConflictException);
          expect(error.message).toBe('Email already exists');
          done();
        },
      });
    });
  });

  describe('findAll$', () => {
    it('should return all users', (done) => {
      const mockUsers = [mockUser];
      mockUserRepository.find.mockResolvedValue(mockUsers);

      service.findAll$().subscribe({
        next: (result) => {
          expect(result).toEqual(mockUsers);
          expect(mockUserRepository.find).toHaveBeenCalledWith({
            select: ['id', 'username', 'email', 'firstName', 'lastName', 'isActive', 'createdAt'],
          });
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('findOne$', () => {
    it('should return a user by id', (done) => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      service.findOne$(1).subscribe({
        next: (result) => {
          expect(result).toEqual(mockUser);
          expect(mockUserRepository.findOne).toHaveBeenCalledWith({
            where: { id: 1 },
            relations: ['watchlist', 'favorites', 'ratings'],
          });
          done();
        },
        error: done.fail,
      });
    });

    it('should throw NotFoundException if user not found', (done) => {
      mockUserRepository.findOne.mockResolvedValue(null);

      service.findOne$(999).subscribe({
        next: () => done.fail('Should have thrown NotFoundException'),
        error: (error) => {
          expect(error).toBeInstanceOf(NotFoundException);
          done();
        },
      });
    });
  });

  describe('findByUsernameOrEmail$', () => {
    it('should find user by username or email', (done) => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };

      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      service.findByUsernameOrEmail$('testuser').subscribe({
        next: (result) => {
          expect(result).toEqual(mockUser);
          expect(mockQueryBuilder.where).toHaveBeenCalledWith(
            'user.username = :value OR user.email = :value',
            { value: 'testuser' },
          );
          done();
        },
        error: done.fail,
      });
    });

    it('should throw NotFoundException if user not found', (done) => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      service.findByUsernameOrEmail$('nonexistent').subscribe({
        next: () => done.fail('Should have thrown NotFoundException'),
        error: (error) => {
          expect(error).toBeInstanceOf(NotFoundException);
          done();
        },
      });
    });
  });

  describe('update$', () => {
    it('should update a user', (done) => {
      const updateUserDto: UpdateUserDto = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const updatedUser = { ...mockUser, ...updateUserDto };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(updatedUser);

      service.update$(1, updateUserDto).subscribe({
        next: (result) => {
          expect(result.firstName).toBe('Updated');
          expect(result.lastName).toBe('Name');
          expect(mockUserRepository.save).toHaveBeenCalled();
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('remove$', () => {
    it('should remove a user', (done) => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.remove.mockResolvedValue(mockUser);

      service.remove$(1).subscribe({
        next: () => {
          expect(mockUserRepository.remove).toHaveBeenCalledWith(mockUser);
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('validateUser$', () => {
    it('should validate user with correct password', (done) => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };

      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockUser.validatePassword.mockResolvedValue(true);

      service.validateUser$('testuser', 'password').subscribe({
        next: (result) => {
          expect(result).toEqual(mockUser);
          expect(mockUser.validatePassword).toHaveBeenCalledWith('password');
          done();
        },
        error: done.fail,
      });
    });

    it('should throw UnauthorizedException for invalid password', (done) => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };

      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockUser.validatePassword.mockResolvedValue(false);

      service.validateUser$('testuser', 'wrongpassword').subscribe({
        next: () => done.fail('Should have thrown UnauthorizedException'),
        error: (error) => {
          expect(error).toBeInstanceOf(UnauthorizedException);
          done();
        },
      });
    });
  });

  describe('login$', () => {
    it('should login user and return token', (done) => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };

      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockUser.validatePassword.mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('mock.jwt.token');

      service.login$('testuser', 'password').subscribe({
        next: (result) => {
          expect(result.accessToken).toBe('mock.jwt.token');
          expect(result.user.username).toBe('testuser');
          expect(mockJwtService.sign).toHaveBeenCalledWith({
            sub: 1,
            username: 'testuser',
            email: 'test@example.com',
          });
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('addToWatchlist$', () => {
    it('should add movie to watchlist', (done) => {
      const userWithWatchlist = { ...mockUser, watchlist: [] };

      mockUserRepository.findOne.mockResolvedValue(userWithWatchlist);
      mockMovieRepository.findOne.mockResolvedValue(mockMovie);
      mockUserRepository.save.mockResolvedValue({
        ...userWithWatchlist,
        watchlist: [mockMovie],
      });

      service.addToWatchlist$(1, 1).subscribe({
        next: (result) => {
          expect(result.watchlist).toContainEqual(mockMovie);
          expect(mockUserRepository.save).toHaveBeenCalled();
          done();
        },
        error: done.fail,
      });
    });

    it('should not add duplicate movie to watchlist', (done) => {
      const userWithWatchlist = { ...mockUser, watchlist: [mockMovie] };

      mockUserRepository.findOne.mockResolvedValue(userWithWatchlist);
      mockMovieRepository.findOne.mockResolvedValue(mockMovie);

      service.addToWatchlist$(1, 1).subscribe({
        next: (result) => {
          expect(result.watchlist.length).toBe(1);
          done();
        },
        error: done.fail,
      });
    });

    it('should throw NotFoundException if movie not found', (done) => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockMovieRepository.findOne.mockResolvedValue(null);

      service.addToWatchlist$(1, 999).subscribe({
        next: () => done.fail('Should have thrown NotFoundException'),
        error: (error) => {
          expect(error).toBeInstanceOf(NotFoundException);
          done();
        },
      });
    });
  });

  describe('removeFromWatchlist$', () => {
    it('should remove movie from watchlist', (done) => {
      const userWithWatchlist = { ...mockUser, watchlist: [mockMovie] };

      mockUserRepository.findOne.mockResolvedValue(userWithWatchlist);
      mockUserRepository.save.mockResolvedValue({
        ...userWithWatchlist,
        watchlist: [],
      });

      service.removeFromWatchlist$(1, 1).subscribe({
        next: (result) => {
          expect(result.watchlist).toEqual([]);
          expect(mockUserRepository.save).toHaveBeenCalled();
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('changePassword$', () => {
    it('should change user password', (done) => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUser.validatePassword.mockResolvedValue(true);
      mockUserRepository.save.mockResolvedValue(mockUser);

      service.changePassword$(1, 'oldPassword', 'newPassword').subscribe({
        next: (result) => {
          expect(result).toEqual(mockUser);
          expect(mockUser.validatePassword).toHaveBeenCalledWith('oldPassword');
          expect(mockUserRepository.save).toHaveBeenCalled();
          done();
        },
        error: done.fail,
      });
    });

    it('should throw UnauthorizedException for incorrect old password', (done) => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUser.validatePassword.mockResolvedValue(false);

      service.changePassword$(1, 'wrongPassword', 'newPassword').subscribe({
        next: () => done.fail('Should have thrown UnauthorizedException'),
        error: (error) => {
          expect(error).toBeInstanceOf(UnauthorizedException);
          done();
        },
      });
    });
  });
});