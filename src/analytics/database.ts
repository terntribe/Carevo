import { config } from '#config/index.js';
import { Pool } from 'pg';

export class DatabaseRepository {
  private pool: Pool;

  contstructor() {
    this.pool = new Pool({
      host: config.analytics_db.host,
      database: config.analytics_db.name,
      port: config.analytics_db.port,
      user: config.analytics_db.username,
      password: config.analytics_db.password,
    });
  }
}
