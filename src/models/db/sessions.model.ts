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

  @Column({ type: 'enum', enum: ['english'], default: 'english' })
  language!: string;

  @OneToOne(() => LastMessage, { cascade: true, eager: true })
  @JoinColumn()
  lastMessage!: LastMessage;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;

  static findByIdOrPhoneNumber(options: { id?: string; phoneNumber?: string }) {
    const { id, phoneNumber } = options;
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

    return query
      .leftJoinAndSelect('session.lastMessage', 'lastMessage')
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

  @OneToOne(() => Session, (session) => session.lastMessage)
  session!: Session;
}
