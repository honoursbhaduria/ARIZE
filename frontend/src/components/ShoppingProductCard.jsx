import { useState } from 'react'
import { ExternalLink, Minus, Plus, ShoppingCart } from 'lucide-react'
import { PRODUCT_PLACEHOLDER } from '../lib/placeholder'
import { Badge, Button } from '../ui/components'

export default function ShoppingProductCard({ product, onAddToCart }) {
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = async () => {
    setIsAdding(true)
    try {
      await onAddToCart({
        product_name: product.title,
        product_image: product.image_url || '',
        product_category: product.category || 'food',
        wikipedia_url: product.wiki_url || '',
        amazon_url: product.shopping_links?.amazon || '',
        flipkart_url: product.shopping_links?.flipkart || '',
        quantity,
        price_estimate: 0,
      })
      setQuantity(1)
    } finally {
      setIsAdding(false)
    }
  }

  const links = [
    { key: 'amazon', label: 'Amazon', href: product.shopping_links?.amazon },
    { key: 'flipkart', label: 'Flipkart', href: product.shopping_links?.flipkart },
    { key: 'wiki', label: 'Learn more', href: product.wiki_url },
  ].filter((link) => link.href)

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', aspectRatio: '4 / 3', background: 'var(--surface-2)' }}>
        <img
          src={product.image_url || PRODUCT_PLACEHOLDER}
          alt={product.title}
          loading="lazy"
          onError={(e) => { e.currentTarget.src = PRODUCT_PLACEHOLDER }}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <span style={{ position: 'absolute', top: 8, left: 8 }}><Badge>{product.category || 'Health product'}</Badge></span>
      </div>
      <div className="stack-sm" style={{ padding: 14, flex: 1 }}>
        <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}>{product.title}</strong>
        {product.description && <p className="tiny muted">{product.description.slice(0, 100)}{product.description.length > 100 ? '…' : ''}</p>}
        {links.length > 0 && (
          <div className="row-wrap" style={{ gap: 6 }}>
            {links.map((link) => (
              <a key={link.key} href={link.href} target="_blank" rel="noopener noreferrer" className="chip" style={{ minHeight: 30, fontSize: '0.78rem' }}>
                <ExternalLink size={12} /> {link.label}
              </a>
            ))}
          </div>
        )}
        <div className="row" style={{ marginTop: 'auto', paddingTop: 6 }}>
          <div className="row" style={{ gap: 4 }}>
            <button type="button" className="icon-btn" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label="Decrease quantity"><Minus size={16} /></button>
            <span className="mono" style={{ minWidth: 22, textAlign: 'center' }} aria-label="Quantity">{quantity}</span>
            <button type="button" className="icon-btn" onClick={() => setQuantity((q) => q + 1)} aria-label="Increase quantity"><Plus size={16} /></button>
          </div>
          <Button variant="primary" size="sm" icon={ShoppingCart} loading={isAdding} onClick={handleAdd} className="grow">Add</Button>
        </div>
      </div>
    </div>
  )
}
