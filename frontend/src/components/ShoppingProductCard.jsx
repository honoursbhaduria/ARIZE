import { useState } from 'react'
import { ExternalLink, Minus, Plus, ShoppingCart } from 'lucide-react'
import { PRODUCT_PLACEHOLDER } from '../lib/placeholder'
import { Button } from '../ui/components'

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
    { key: 'wiki', label: 'Info', href: product.wiki_url },
  ].filter((link) => link.href)

  return (
    <article className="shop-product">
      <div className="shop-product__image">
        <img
          src={product.image_url || PRODUCT_PLACEHOLDER}
          alt={product.title}
          loading="lazy"
          onError={(e) => { e.currentTarget.src = PRODUCT_PLACEHOLDER }}
        />
      </div>
      <div className="shop-product__body">
        <span className="shop-product__title">{product.title}</span>
        {product.description && <p className="shop-product__desc">{product.description}</p>}
        {links.length > 0 && (
          <div className="shop-product__links">
            {links.map((link) => (
              <a key={link.key} href={link.href} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={10} /> {link.label}
              </a>
            ))}
          </div>
        )}
        <div className="shop-product__buy">
          <button type="button" className="icon-btn" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label="Decrease quantity"><Minus size={14} /></button>
          <span className="mono small" aria-label="Quantity">{quantity}</span>
          <button type="button" className="icon-btn" onClick={() => setQuantity((q) => q + 1)} aria-label="Increase quantity"><Plus size={14} /></button>
          <Button variant="primary" size="sm" icon={ShoppingCart} loading={isAdding} onClick={handleAdd} aria-label={`Add ${product.title} to wish list`}>Add</Button>
        </div>
      </div>
    </article>
  )
}
