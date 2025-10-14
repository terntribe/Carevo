import { AnalyticsEvent, LogEvent } from '#analytics/types.js';
import { BaseEventProcessor } from './base-processors.js';

export class LogProcessor extends BaseEventProcessor {
  async process(events: LogEvent[]): Promise<void> {
    events.forEach((event) => {
      this.eventLogger.info(event.action, {
        id: crypto.randomUUID(), // I would like this to come from the db
        userId: event.userId,
        topic: event.topic,
        timestamp: event.timestamp,
      });
    });

    await this.db.saveLogs(events);
  }

  protected shouldLog(event: AnalyticsEvent): boolean {
    return true;
  }

  protected shouldCreateMetric(event: AnalyticsEvent): boolean {
    return false;
  }
}
