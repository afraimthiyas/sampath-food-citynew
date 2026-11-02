import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './data-source-options';

/** Entry point for the TypeORM CLI: `npm run migration:generate` / `migration:run`. */
export default new DataSource(
  buildDataSourceOptions(process.env.DATABASE_URL ?? 'postgres://sfc:sfc_password@localhost:5432/sampath_food_city'),
);
