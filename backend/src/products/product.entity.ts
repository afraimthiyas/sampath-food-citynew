import {
  Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Relation, UpdateDateColumn,
} from 'typeorm';
import { Category } from '../categories/category.entity';
import { decimalTransformer } from '../common/decimal.transformer';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  sku: string;

  @Index()
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Price in LKR. */
  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: decimalTransformer })
  price: number;

  /** Pack size shown to shoppers, e.g. "1 kg", "400 ml". */
  @Column()
  unit: string;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'int', default: 0 })
  stock: number;

  /** When stock drops to or below this level the product shows up in low-stock alerts. */
  @Column({ type: 'int', default: 10 })
  reorderLevel: number;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Category, (c) => c.products, { nullable: false, eager: true })
  category: Relation<Category>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
