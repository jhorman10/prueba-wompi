import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TransactionStatus } from './transaction-status.enum';

@Entity('transactions')
export class TransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, default: TransactionStatus.PENDING })
  status: TransactionStatus = TransactionStatus.PENDING;

  @Column({ type: 'varchar', length: 255, nullable: true })
  gatewayToken: string | null = null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  gatewayReference: string | null = null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  gatewayErrorCode: string | null = null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  idempotencyKey: string | null = null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  productId: string | null = null;

  @Column({ type: 'int', nullable: true })
  quantity: number | null = null;

  /** JSON array of { productId, quantity, unitPrice, productName } */
  @Column({ type: 'text', nullable: true })
  items: string | null = null;

  @Column({ type: 'int' })
  totalAmount: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cardholderName: string | null = null;

  @Column({ type: 'varchar', length: 4, nullable: true })
  cardLastFour: string | null = null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
