import { DatabaseRepository } from '#analytics/database.js';
import { AnalyticsEvent } from '#analytics/types.js';
import { analyticsLogger } from '#config/logger.js';

export abstract class BaseEventProcessor {
  constructor(
    protected db: DatabaseRepository,
    protected eventLogger?: typeof analyticsLogger
  ) {}

  abstract process(events: AnalyticsEvent[]): Promise<void>;

  protected shouldLog(event: AnalyticsEvent): boolean {
    return true;
  }

  protected shouldCreateMetric(event: AnalyticsEvent): boolean {
    return false;
  }
}
