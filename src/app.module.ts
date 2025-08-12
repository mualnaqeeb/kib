import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { redisStore } from 'cache-manager-redis-yet';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';

// Feature Modules
import { MoviesModule } from './movies/movies.module';
import { UsersModule } from './users/users.module';
import { RatingsModule } from './ratings/ratings.module';
import { TmdbModule } from './tmdb/tmdb.module';
import { AuthModule } from './auth/auth.module';

// Entities
import { Movie } from './entities/movie.entity';
import { User } from './entities/user.entity';
import { Rating } from './entities/rating.entity';
import { Genre } from './entities/genre.entity';
import { TmdbSyncService } from './tmdb/tmdb-sync.service';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    // TypeORM Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: [Movie, User, Rating, Genre],
        synchronize: process.env.NODE_ENV !== 'production', // Disable in production
        logging: process.env.NODE_ENV === 'development',
        autoLoadEntities: true,
      }),
    }),

    // Cache Manager with Redis
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: configService.get('redis.host'),
            port: configService.get('redis.port'),
          },
          ttl: 60 * 1000, // Default TTL: 60 seconds
        }),
      }),
    }),

    // Schedule Module for cron jobs
    ScheduleModule.forRoot(),

    // Feature modules
    TypeOrmModule.forFeature([Movie, Genre]),
    AuthModule,
    UsersModule,
    MoviesModule,
    RatingsModule,
    TmdbModule,
  ],
  controllers: [AppController],
  providers: [AppService, TmdbSyncService],
})
export class AppModule {}