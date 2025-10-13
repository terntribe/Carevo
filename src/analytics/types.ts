export enum EventType {
  LOG = 'LOG',
  METRIC = 'METRIC',
  LOG_METRIC = 'LOG_METRIC',
}

export interface LogEvent {
  userId: string;
  action: string;
}

export interface MetricEvent {
  metric: string;
  amount: number;
}

export interface AnalyticsEvent {
  type: EventType;
  timestamp: Date;
  sessionId: string;
  topic: string;
  log?: LogEvent;
  metric?: MetricEvent;
  metadata?: {
    [key: string]: any;
  };
}

export interface ProcessingResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: string[];
}
