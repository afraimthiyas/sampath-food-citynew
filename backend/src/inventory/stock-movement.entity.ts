import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';

export enum StockReason {
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  ADJUSTMENT = 'ADJUSTMENT',
  DAMAGE = 'DAMAGE',
  CANCELLATION = 'CANCELLATION',
}

/** Append-only ledger: every change to Product.stock leaves a row here. */
@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Product, { nullable: false, onDelete: 'CASCADE' })
  product: Relation<Product>;

  /** Positive = stock in, negative = stock out. */
  @Column({ type: 'int' })
  delta: number;

  @Column({ type: 'int' })
  balanceAfter: number;

  @Column({ type: 'enum', enum: StockReason })
  reason: StockReason;

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  createdBy: Relation<User> | null;

  @CreateDateColumn()
  createdAt: Date;
}
