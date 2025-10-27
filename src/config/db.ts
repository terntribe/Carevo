// import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from './index.js';
import { Session, Message } from '#models/db/sessions.model.js';
import { WhatsAppUser } from '#models/db/whatsapp-user.models.js';

const initDatabase = async () => {
  let options;

  if (config.env === 'development') {
    options = {
      type: 'postgres',
      host: config.db.host,
      port: config.db.port,
      username: config.db.username,
      password: config.db.password,
      database: config.db.name,
      entities: [WhatsAppUser, Session, Message],
      synchronize: true,
      logging: false,
    } as DataSourceOptions;
  } else if (config.env === 'production') {
    options = {
      type: 'postgres',
      host: config.db.host,
      port: config.db.port,
      username: config.db.username,
      password: config.db.password,
      database: config.db.name,
      entities: [WhatsAppUser, Session, Message],
      synchronize: true,
      logging: false,
    } as DataSourceOptions;
  } else {
    throw new Error('No config for the current environment');
  }

  const AppDataSource = new DataSource(options);

  try {
    await AppDataSource.initialize();
  } catch (error) {
    throw error;
  }
};

export default initDatabase;
