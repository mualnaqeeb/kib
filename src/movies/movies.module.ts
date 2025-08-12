import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoviesService } from './movies.service';
import { MoviesController } from './movies.controller';
import { Movie } from '../entities/movie.entity';
import { TmdbModule } from '../tmdb/tmdb.module';

@Module({
  imports: [TypeOrmModule.forFeature([Movie]), TmdbModule],
  controllers: [MoviesController],
  providers: [MoviesService],
  exports: [MoviesService],
})
export class MoviesModule {}
