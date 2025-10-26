import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  BaseEntity,
  OneToMany,
  ManyToOne,
} from 'typeorm';

export interface Identifier {
  id?: string;
  phoneNumber?: string;
}

@Entity()
export class Session extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: ['english'], default: 'english' })
  language!: string;

  @Column({ type: 'boolean', default: false })
  isFirstSession!: boolean;

  @OneToMany(() => Message, (message) => message.session, { eager: true })
  messages!: Message[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}

@Entity()
export class Message extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: string;

  @Column({ type: 'varchar' })
  query!: string;

  @Column('simple-array')
  options!: string[];

  @ManyToOne(() => Session, (session) => session.messages)
  session!: Session;
}
