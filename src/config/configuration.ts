export default () => ({
  port: parseInt(process.env.PORT || '8080', 10),
  database: {
    host: process.env.DATABASE_HOST || 'postgres',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'kib_user',
    password: process.env.DATABASE_PASSWORD || 'kib_password',
    database: process.env.DATABASE_NAME || 'kib_db',
  },
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  tmdb: {
    apiKey: process.env.TMDB_API_KEY || '',
    baseUrl: process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'super_secret_key',
    expiresIn: process.env.JWT_EXPIRATION || '3600s',
  },
});