export enum EventType {
  LOG = 'LOG',
  METRIC = 'METRIC',
  LOG_METRIC = 'LOG_METRIC',
}

export interface AnalyticsEvent {
  type: EventType;
  timestamp: Date;
  sessionId: string;
  topic: string;
  metadata?: {
    [key: string]: any;
  };
}

export interface LogEvent extends AnalyticsEvent {
  userId: string;
  action: string;
}

export interface MetricEvent extends AnalyticsEvent {
  metric: string;
  value: number;
}

export interface ProcessingResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: string[];
}
