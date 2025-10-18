import { config } from '#config/index.js';
import { Pool, PoolClient } from 'pg';
import { AnalyticsEvent, LogEvent, MetricEvent } from './types.js';

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

  async getDBClient() {
    return await this.pool.connect();
  }

  async saveLogs(events: LogEvent[]): Promise<void> {
    const client = await this.getDBClient();
    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO analytics_event_logs (user_id, topic, action, timestamp)
        VALUES ($1, $2, $3, $4)
      `;

      for (const event of events) {
        await client.query(query, [
          event.sessionId,
          event.topic,
          event.action,
          event.timestamp,
        ]);

        await client.query('COMMIT');
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async incrementMetric(events: MetricEvent[]) {
    const client = await this.getDBClient();
    try {
      const query = `
      INSERT INTO metrics (name, value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (name)
      DO UPDATE SET value = metrics.value + $2, updated_at = NOW()
    `;

      await client.query('BEGIN');

      for (const event of events) {
        await client.query(query, [event.metric, event.value]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
