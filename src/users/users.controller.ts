import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, LoginDto } from './dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { User } from '../entities/user.entity';
import { Movie } from '../entities/movie.entity';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: User,
  })
  @ApiResponse({ status: 409, description: 'Username or email already exists' })
  register(@Body() createUserDto: CreateUserDto): Observable<User> {
    return this.usersService.create$(createUserDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      properties: {
        user: { type: 'object' },
        accessToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() loginDto: LoginDto) {
    return this.usersService.login$(loginDto.username, loginDto.password);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'List of users',
    type: [User],
  })
  findAll(): Observable<User[]> {
    return this.usersService.findAll$();
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile',
    type: User,
  })
  getProfile(@CurrentUser() user: User): Observable<User> {
    return this.usersService.findOne$(user.id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: User,
  })
  updateProfile(
    @CurrentUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
  ): Observable<User> {
    return this.usersService.update$(user.id, updateUserDto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    type: User,
  })
  @ApiResponse({ status: 401, description: 'Invalid current password' })
  changePassword(
    @CurrentUser() user: User,
    @Body() changePasswordDto: { oldPassword: string; newPassword: string },
  ): Observable<User> {
    return this.usersService.changePassword$(
      user.id,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
  }

  @Get('watchlist')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user watchlist' })
  @ApiResponse({
    status: 200,
    description: 'User watchlist',
    type: [Movie],
  })
  getWatchlist(@CurrentUser() user: User): Observable<Movie[]> {
    return this.usersService.getWatchlist$(user.id);
  }

  @Post('watchlist/:movieId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add movie to watchlist' })
  @ApiResponse({
    status: 200,
    description: 'Movie added to watchlist',
    type: User,
  })
  @ApiResponse({ status: 404, description: 'Movie not found' })
  @ApiParam({ name: 'movieId', type: Number })
  addToWatchlist(
    @CurrentUser() user: User,
    @Param('movieId', ParseIntPipe) movieId: number,
  ): Observable<User> {
    return this.usersService.addToWatchlist$(user.id, movieId);
  }

  @Delete('watchlist/:movieId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove movie from watchlist' })
  @ApiResponse({
    status: 200,
    description: 'Movie removed from watchlist',
    type: User,
  })
  @ApiParam({ name: 'movieId', type: Number })
  removeFromWatchlist(
    @CurrentUser() user: User,
    @Param('movieId', ParseIntPipe) movieId: number,
  ): Observable<User> {
    return this.usersService.removeFromWatchlist$(user.id, movieId);
  }

  @Get('favorites')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user favorites' })
  @ApiResponse({
    status: 200,
    description: 'User favorites',
    type: [Movie],
  })
  getFavorites(@CurrentUser() user: User): Observable<Movie[]> {
    return this.usersService.getFavorites$(user.id);
  }

  @Post('favorites/:movieId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add movie to favorites' })
  @ApiResponse({
    status: 200,
    description: 'Movie added to favorites',
    type: User,
  })
  @ApiResponse({ status: 404, description: 'Movie not found' })
  @ApiParam({ name: 'movieId', type: Number })
  addToFavorites(
    @CurrentUser() user: User,
    @Param('movieId', ParseIntPipe) movieId: number,
  ): Observable<User> {
    return this.usersService.addToFavorites$(user.id, movieId);
  }

  @Delete('favorites/:movieId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove movie from favorites' })
  @ApiResponse({
    status: 200,
    description: 'Movie removed from favorites',
    type: User,
  })
  @ApiParam({ name: 'movieId', type: Number })
  removeFromFavorites(
    @CurrentUser() user: User,
    @Param('movieId', ParseIntPipe) movieId: number,
  ): Observable<User> {
    return this.usersService.removeFromFavorites$(user.id, movieId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({
    status: 200,
    description: 'User details',
    type: User,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiParam({ name: 'id', type: Number })
  findOne(@Param('id', ParseIntPipe) id: number): Observable<User> {
    return this.usersService.findOne$(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: User,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiParam({ name: 'id', type: Number })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Observable<User> {
    return this.usersService.update$(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiParam({ name: 'id', type: Number })
  remove(@Param('id', ParseIntPipe) id: number): Observable<void> {
    return this.usersService.remove$(id);
  }
}