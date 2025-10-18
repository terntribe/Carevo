import { AnalyticsEvent, MetricEvent } from '#analytics/types.js';
import { BaseEventProcessor } from './base-processors.js';

export class MetricProcessor extends BaseEventProcessor {
  async process(events: MetricEvent[]): Promise<void> {
    await this.db.incrementMetric(events);
  }

  protected shouldCreateMetric(event: AnalyticsEvent): boolean {
    return true;
  }

  protected shouldLog(event: AnalyticsEvent): boolean {
    return false;
  }
}
