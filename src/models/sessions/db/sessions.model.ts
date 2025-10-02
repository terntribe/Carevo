import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  BaseEntity,
} from 'typeorm';

export interface Identifier {
  id?: string;
  phoneNumber?: string;
}

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

  static findByIdOrPhoneNumber(id?: string, phoneNumber?: string) {
    let query;

    if (!id && !phoneNumber) {
      return null;
    }

    if (id && phoneNumber) {
      query = this.createQueryBuilder('session')
        .where('session.id = :id', { id })
        .orWhere('session.phoneNumber = :phoneNumber', { phoneNumber });
    } else {
      query = this.createQueryBuilder('session').where(
        id ? 'session.id = :id' : 'session.phoneNumber = :phoneNumber',
        { id, phoneNumber }
      );
    }

    return query.getOne();
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
