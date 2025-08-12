# KIB Movie Database API

A comprehensive RESTful API for managing movies, ratings, and watchlists. This application integrates with TMDB (The Movie Database) to provide rich movie data while allowing users to rate movies and manage their personal watchlists.

## 🎬 Features

- **Movie Management**: Full CRUD operations for movies with advanced filtering
- **TMDB Integration**: Automatic synchronization with TMDB database
- **User Authentication**: JWT-based authentication system
- **Rating System**: Users can rate movies and write reviews
- **Watchlist & Favorites**: Personal movie collections for users
- **Caching**: Redis-based caching for improved performance
- **API Documentation**: Interactive Swagger/OpenAPI documentation
- **Docker Support**: Complete containerization with Docker Compose
- **RxJS Observables**: Functional reactive programming paradigm

## 🚀 Quick Start

### Using Docker (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd kib
```

2. Create a `.env` file from the example:
```bash
cp .env.example .env
```

3. Add your TMDB API key to the `.env` file:
```
TMDB_API_KEY=your_actual_tmdb_api_key_here
```

4. Start the application:
```bash
docker-compose up
```

The application will be available at:
- **API**: http://localhost:8080
- **API Documentation**: http://localhost:8080/api

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up PostgreSQL and Redis locally, or use Docker:
```bash
docker run -d --name postgres -p 5432:5432 -e POSTGRES_USER=kib_user -e POSTGRES_PASSWORD=kib_password -e POSTGRES_DB=kib_db postgres:15
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

3. Create a `.env` file with your configuration

4. Run the application:
```bash
# Development
npm run start:dev

# Production build
npm run build
npm run start:prod
```

## 📚 API Documentation

Once the application is running, access the interactive API documentation at:
http://localhost:8080/api

### Main Endpoints

#### Authentication
- `POST /users/register` - Register a new user
- `POST /users/login` - User login

#### Movies
- `GET /movies` - List movies with pagination and filters
- `GET /movies/:id` - Get movie details
- `GET /movies/search` - Search movies by title
- `GET /movies/genre/:genreId` - Get movies by genre
- `GET /movies/trending` - Get trending movies
- `GET /movies/top-rated` - Get top-rated movies
- `POST /movies/sync/:tmdbId` - Sync movie from TMDB

#### Ratings
- `POST /ratings/movies/:movieId` - Rate a movie
- `GET /ratings/movies/:movieId` - Get movie ratings
- `GET /ratings/movies/:movieId/stats` - Get rating statistics
- `GET /ratings/my-ratings` - Get user's ratings
- `DELETE /ratings/:id` - Delete a rating

#### User Management
- `GET /users/profile` - Get current user profile
- `PATCH /users/profile` - Update profile
- `GET /users/watchlist` - Get watchlist
- `POST /users/watchlist/:movieId` - Add to watchlist
- `DELETE /users/watchlist/:movieId` - Remove from watchlist
- `GET /users/favorites` - Get favorites
- `POST /users/favorites/:movieId` - Add to favorites
- `DELETE /users/favorites/:movieId` - Remove from favorites

## 🏗️ Architecture

### Technology Stack
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Cache**: Redis
- **Authentication**: JWT with Passport
- **API Documentation**: Swagger/OpenAPI
- **Programming Paradigm**: Functional Reactive Programming with RxJS
- **Container**: Docker & Docker Compose

### Project Structure
```
src/
├── auth/           # Authentication module (JWT, Guards)
├── config/         # Configuration module
├── entities/       # Database entities
├── movies/         # Movies module
├── ratings/        # Ratings module
├── tmdb/          # TMDB integration module
├── users/         # Users module
└── main.ts        # Application entry point
```

### Design Principles
- **SOLID Principles**: Single Responsibility, Open/Closed, etc.
- **DRY**: Don't Repeat Yourself
- **KISS**: Keep It Simple, Stupid
- **Functional Programming**: Using RxJS observables
- **Dependency Injection**: NestJS IoC container
- **Modular Architecture**: Feature-based modules

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USER=kib_user
DATABASE_PASSWORD=kib_password
DATABASE_NAME=kib_db

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# TMDB API
TMDB_API_KEY=your_tmdb_api_key_here
TMDB_BASE_URL=https://api.themoviedb.org/3

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRATION=3600s

# Application
PORT=8080
NODE_ENV=development
```

## 🧪 Testing

Run the test suite:

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📊 Database Schema

### Main Entities

- **Movie**: Stores movie information from TMDB
- **User**: User accounts with authentication
- **Rating**: User ratings for movies
- **Genre**: Movie genres

### Relationships
- Users can have many ratings
- Movies can have many ratings
- Users can have many movies in watchlist/favorites
- Movies belong to multiple genres

## 🚢 Production Deployment

### Docker Deployment

1. Build the production image:
```bash
docker build -t kib-api:latest .
```

2. Use environment-specific docker-compose:
```bash
docker-compose -f docker-compose.yml up -d
```

### Security Considerations

- Change default JWT secret in production
- Use strong passwords for database
- Enable HTTPS in production
- Implement rate limiting
- Add input validation and sanitization
- Use environment-specific configurations

## 🔄 TMDB Synchronization

The application automatically syncs with TMDB:
- Initial sync on startup
- Hourly sync for popular movies
- On-demand sync via API endpoints

## 🛠️ Development

### Commands

```bash
# Install dependencies
npm install

# Run in development mode
npm run start:dev

# Build for production
npm run build

# Format code
npm run format

# Lint code
npm run lint

# Run tests
npm test
```

### Git Workflow

1. Create feature branch from `main`
2. Make changes and commit
3. Push branch and create pull request
4. Review and merge to `main`

## 📝 License

This project is [UNLICENSED](LICENSE).

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📧 Contact

For questions or support, please contact the development team.

---

Built with ❤️ using NestJS and RxJS