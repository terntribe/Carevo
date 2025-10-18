import { DatabaseRepository } from '#analytics/database.js';
import { BaseEventProcessor } from '#analytics/processors/base-processors.js';
import { LogProcessor } from '#analytics/processors/log-processor.js';
import { MetricProcessor } from '#analytics/processors/metric-processors.js';
import {
  AnalyticsEvent,
  EventType,
  LogEvent,
  MetricEvent,
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
    logger.info('Analytics service startup complete');
  }

  async processEvents(events: AnalyticsEvent[]): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      success: false,
      processed: 0,
      failed: 0,
      errors: [],
    };

    try {
      const validEvents = this.validateEvents(events);

      const groupedEvents = this.groupEventsByType(validEvents);

      for (const [eventType, events] of groupedEvents) {
        try {
          const processor = this.processors.get(eventType);

          if (!processor) {
            logger.warn(`No processor found for event type ${eventType}`);
            result.failed += events.length;
            continue;
          }

          await processor.process(events);
          result.processed += events.length;
        } catch (error) {
          logger.error(`Error processing ${eventType} events: `, error);

          result.failed += events.length;
          result.errors?.push(`${eventType}: ${error.message}`);
        }
      }
      result.success = result.failed === 0;
    } catch (error) {
      logger.error('Fatal error in analytics service:', error);
      result.success = false;
      result.errors?.push(error.message);
    }

    return result;
  }

  private validateEvents(events: AnalyticsEvent[]): AnalyticsEvent[] {
    let validated = events.filter((event) => {
      if (!event.type || !event.topic || !event.sessionId) {
        logger.warn('Invalid event', event);
        return false;
      }
      if (event.type === EventType.LOG && !isLogEvent(event)) {
        return false;
      }
      if (event.type === EventType.METRIC && !isMetricEvent(event)) {
        return false;
      }
      return true;
    });

    return validated;
  }

  private groupEventsByType(
    events: AnalyticsEvent[]
  ): Map<EventType, AnalyticsEvent[]> {
    const grouped = new Map<EventType, AnalyticsEvent[]>();

    events.forEach((event) => {
      if (!grouped.has(event.type)) {
        grouped.set(event.type, []);
      }
      grouped.get(event.type)?.push(event);
    });

    return grouped;
  }

  async shutdown() {
    await this.db.close();
    logger.info('Analytics service shutdown complete');
  }
}

function isLogEvent(e: AnalyticsEvent): e is LogEvent {
  return 'action' in e && 'userId' in e;
}

function isMetricEvent(e: AnalyticsEvent): e is LogEvent {
  return 'metric' in e && 'value' in e;
}
