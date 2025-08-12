import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Rating } from './rating.entity';

@Entity('movies')
@Index(['tmdbId'], { unique: true })
@Index(['title'])
@Index(['releaseDate'])
export class Movie {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  tmdbId: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  overview: string;

  @Column({ nullable: true })
  posterPath: string;

  @Column({ nullable: true })
  backdropPath: string;

  @Column({ type: 'date', nullable: true })
  releaseDate: Date;

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0 })
  voteAverage: number;

  @Column({ default: 0 })
  voteCount: number;

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0 })
  popularity: number;

  @Column('simple-array', { nullable: true })
  genreIds: number[];

  @Column('jsonb', { nullable: true })
  genres: { id: number; name: string }[];

  @Column({ nullable: true })
  originalLanguage: string;

  @Column({ nullable: true })
  originalTitle: string;

  @Column({ default: false })
  adult: boolean;

  @Column({ default: false })
  video: boolean;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
  userRatingAverage: number;

  @Column({ default: 0 })
  userRatingCount: number;

  @OneToMany(() => Rating, (rating) => rating.movie)
  ratings: Rating[];

  @ManyToMany(() => User, (user) => user.watchlist)
  watchlistedBy: User[];

  @ManyToMany(() => User, (user) => user.favorites)
  favoritedBy: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
