import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { ErrorBox, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { FREE_DELIVERY_THRESHOLD, money } from '../lib/format';
import type { Category, Paginated, Product } from '../lib/types';
import { useAsync } from '../lib/useAsync';

const PERKS = [
  { icon: '🚚', title: 'Free delivery', text: `On orders over ${money(FREE_DELIVERY_THRESHOLD)}` },
  { icon: '🥬', title: 'Fresh every day', text: 'Produce and bread restocked each morning' },
  { icon: '💵', title: 'Pay on delivery', text: 'Cash or card when it arrives' },
];

export default function Home() {
  const { data, error, loading, reload } = useAsync(
    () => Promise.all([
      api<Category[]>('/categories'),
      api<Paginated<Product>>('/products', { query: { limit: 100, sort: 'name' } }),
    ]),
    [],
  );
  const [categories, products] = data ?? [[], { items: [] as Product[] }];
  const firstOf = (slug: string) => products.items.find((p) => p.category.slug === slug);
  const picks = products.items.filter((p) => p.stock > 0).filter((_, i) => i % 4 === 1).slice(0, 8);

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">Neighbourhood supermarket, online</span>
            <h1>Fresh groceries,<br />delivered to your door.</h1>
            <p>Rice, vegetables, tea and everyday essentials — pick what you need, we'll pack it and bring it over the same day.</p>
            <div className="hero-cta">
              <Link to="/shop" className="btn btn-primary btn-lg">Start shopping</Link>
              <Link to="/shop?inStock=true&sort=price_asc" className="btn btn-ghost btn-lg">Browse deals</Link>
            </div>
            <ul className="perks">
              {PERKS.map((p) => (
                <li key={p.title}><span aria-hidden="true">{p.icon}</span><div><strong>{p.title}</strong><small>{p.text}</small></div></li>
              ))}
            </ul>
          </div>
          <img className="hero-art" src="/hero.svg" alt="A basket filled with groceries" width={640} height={560} />
        </div>
      </section>

      <section className="container section">
        <div className="section-head"><h2>Shop by category</h2><Link to="/shop" className="link">View all products →</Link></div>
        {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
          <div className="category-grid">
            {categories.map((c) => {
              const sample = firstOf(c.slug);
              return (
                <Link key={c.id} to={`/shop?category=${c.id}`} className="category-tile">
                  {sample?.imageUrl && <img src={sample.imageUrl} alt="" width={96} height={96} loading="lazy" />}
                  <div><strong>{c.name}</strong><small>{c.productCount} products</small></div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="container section">
        <div className="section-head"><h2>Fresh picks for today</h2><Link to="/shop" className="link">See more →</Link></div>
        {loading ? <Spinner /> : <div className="grid products">{picks.map((p) => <ProductCard key={p.id} product={p} />)}</div>}
      </section>
    </>
  );
}
