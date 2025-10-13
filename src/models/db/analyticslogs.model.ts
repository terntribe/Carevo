import { Entity, Column, PrimaryGeneratedColumn, BaseEntity } from 'typeorm';

/**
 * id
 * sesh_id
 * topic
 * action -> predef actions
 * timestamp
 */

const actions = [
  'topic_request',
  'process_request_success',
  'process_request_failed_invalid_command',
  'process_request_failed_other',
  'response_sent',
  'response_delivered',
  'response_read',
];

@Entity()
export class AnalyticsLog extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  userId!: string;

  @Column({ type: 'varchar' })
  topic!: string;

  @Column({ type: 'enum', enum: actions, default: 'topic_request' })
  action!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp!: Date;
}
