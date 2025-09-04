import winston from 'winston';
import { config } from './index.js';

const { combine, timestamp, json, errors, printf } = winston.format;

const logLevels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
};

export type logLevel = keyof typeof logLevels;

export const rootLogger = winston.createLogger({
  levels: logLevels,
  level: config.log_level,
  defaultMeta: { service: 'api-service' },
  transports: [
    new winston.transports.Console({
      format: combine(
        timestamp({
          format: 'YYYY-MM-DD hh:mm:ss.SSS A',
        }),
        printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
      ),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: combine(timestamp(), json()),
    }),
    new winston.transports.File({
      filename: 'logs/app-logs.log',
      level: 'info',
      format: combine(timestamp(), json()),
    }),
  ],
});

export const analyticsLogger = winston.createLogger({
  levels: logLevels,
  level: config.log_level,
  format: combine(json(), timestamp()),
  defaultMeta: { service: 'analytics' },
  transports: [
    new winston.transports.Console({
      format: combine(timestamp(), json()),
    }),
    new winston.transports.File({
      filename: 'logs/analytics.log',
      level: 'error',
      format: combine(timestamp(), json()),
    }),
  ],
});

export function getLogger(
  logger: winston.Logger,
  metadata?: Record<string, any> & { microservice: string }
) {
  return logger.child(metadata ? metadata : {});
}
