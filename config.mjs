import 'dotenv/config'

export const settings = {
  API_KEY: process.env.API_KEY,
  VERBOSE: Boolean(Number(process.env.VERBOSE ?? 1)),
  CACHE: Boolean(Number(process.env.CACHE ?? 1)),
  FILE_CONCURRENCY: Number(process.env.FILE_CONCURRENCY ?? 0),
  CACHE_DIR: process.env.CACHE_DIR ?? '.dist'
};
