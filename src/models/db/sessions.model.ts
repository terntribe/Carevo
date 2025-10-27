import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  BaseEntity,
  OneToMany,
  ManyToOne,
  AfterLoad,
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

  @OneToMany(() => Message, (message) => message.session, {
    cascade: true,
    eager: true,
  })
  messages!: Message[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;

  @AfterLoad()
  emptyMessageCheck() {
    if (!this.messages) {
      this.messages = [];
    }
  }
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
