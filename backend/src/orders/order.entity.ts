import {
  Column, CreateDateColumn, Entity, Generated, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, Relation,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../common/decimal.transformer';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PACKED = 'PACKED',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  CARD = 'CARD',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Human-friendly running number, rendered as SFC-000042. */
  @Column({ type: 'int', unique: true })
  @Generated('increment')
  orderSeq: number;

  @Index()
  @ManyToOne(() => User, (u) => u.orders, { nullable: false })
  customer: Relation<User>;

  @Index()
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.CASH_ON_DELIVERY })
  paymentMethod: PaymentMethod;

  @Column()
  deliveryAddress: string;

  @Column()
  deliveryCity: string;

  @Column()
  phone: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  subtotal: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  deliveryFee: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  total: number;

  @OneToMany(() => OrderItem, (i) => i.order)
  items: Relation<OrderItem[]>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Order, (o) => o.items, { nullable: false, onDelete: 'CASCADE' })
  order: Relation<Order>;

  @ManyToOne(() => Product, { nullable: false })
  product: Relation<Product>;

  /** Snapshots: later price/name changes must not rewrite history. */
  @Column()
  productName: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  unitPrice: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  lineTotal: number;
}
