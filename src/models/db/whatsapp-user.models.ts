import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  BaseEntity,
  JoinColumn,
} from 'typeorm';
import { Session } from './sessions.model.js';

@Entity()
export class WhatsAppUser extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  phoneNumber!: string;

  @OneToOne(() => Session, { cascade: true, eager: true })
  @JoinColumn()
  lastSession!: Session;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  static findByIdOrPhoneNumber(options: { id?: string; phoneNumber?: string }) {
    const { id, phoneNumber } = options;
    let query;

    if (!id && !phoneNumber) {
      return null;
    }

    if (id && phoneNumber) {
      query = this.createQueryBuilder('whatsappuser')
        .where('whatsappuser.id = :id', { id })
        .orWhere('whatsappuser.phoneNumber = :phoneNumber', { phoneNumber });
    } else {
      query = this.createQueryBuilder('whatsappuser').where(
        id
          ? 'whatsappuser.id = :id'
          : 'whatsappuser.phoneNumber = :phoneNumber',
        { id, phoneNumber }
      );
    }

    return query
      .leftJoinAndSelect('whatsappuser.lastSession', 'lastSession')
      .getOne();
  }
}
