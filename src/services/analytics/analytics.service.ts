import { DatabaseRepository } from '#analytics/database.js';
import { BaseEventProcessor } from '#analytics/processors/base-processors.js';
import { LogProcessor } from '#analytics/processors/log-processor.js';
import { MetricProcessor } from '#analytics/processors/metric-processors.js';
import {
  AnalyticsEvent,
  EventType,
  ProcessingResult,
} from '#analytics/types.js';
import { analyticsLogger, getLogger, rootLogger } from '#config/logger.js';

const logger = getLogger(rootLogger, {
  service: 'analytics-service',
  component: 'service',
});

export class AnalyticsService {
  private db: DatabaseRepository;
  private processors: Map<EventType, BaseEventProcessor>;

  constructor() {
    this.db = new DatabaseRepository();
    this.processors = new Map();
    this.initializeProcessors();
  }

  private initializeProcessors(): void {
    this.processors.set(
      EventType.LOG,
      new LogProcessor(this.db, analyticsLogger)
    );
    this.processors.set(EventType.METRIC, new MetricProcessor(this.db));
  }

  async processEvents(events: AnalyticsEvent[]): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      success: false,
      processed: 0,
      failed: 0,
      errors: [],
    };

    return result;
  }

  private validateEvents(events: AnalyticsEvent[]): AnalyticsEvent[] {
    let validated = events.filter((event) => {
      if (!event.type || !event.topic || !event.sessionId) {
        logger.warn('Invalid event', event);
        return false;
      }
      if (event.type === EventType.LOG && !event.action) return true;
    });

    return validated;
  }
}
