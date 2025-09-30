import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  BaseEntity,
} from 'typeorm';

export type Identifier = {
  id?: string;
  phoneNumber?: string;
};

@Entity()
export class Session extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  phoneNumber!: string;

  @Column({ type: 'enum', enum: ['EN'], default: 'EN' })
  language!: string;

  @OneToOne(() => LastMessage, { cascade: true })
  @JoinColumn()
  lastMessage!: LastMessage;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;

  static findByIdOrPhoneNumber(query: Identifier) {
    return this.createQueryBuilder('session')
      .where(
        'id' in query
          ? 'session.id = :id'
          : 'session.phoneNumber = :phoneNumber',
        { query }
      )
      .getOne();
  }
}

@Entity()
export class LastMessage extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: string;

  @Column({ type: 'varchar' })
  query!: string;

  @Column('simple-array')
  options!: string[];
}
