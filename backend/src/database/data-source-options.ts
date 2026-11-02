import { join } from 'path';
import { DataSourceOptions } from 'typeorm';

/** Shared by the Nest runtime, the TypeORM CLI (migrations) and the seed script. */
export function buildDataSourceOptions(url: string): DataSourceOptions {
  return {
    type: 'postgres',
    url,
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    synchronize: false, // schema changes are always explicit, reviewed migrations
    logging: false,
  };
}
