import { useState } from 'react'
import { ShoppingCart, ExternalLink, Plus, Minus } from 'lucide-react'
import '../styles/ShoppingProductCard.css'

export default function ShoppingProductCard({ product, onAddToCart }) {
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)

  const handleAddToCart = async () => {
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
        price_estimate: 0
      })
      setQuantity(1)
    } catch (error) {
      console.error('Failed to add to cart:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const placeholderImage = 'https://via.placeholder.com/200?text=No+Image'
  const primaryShoppingUrl = product.shopping_links?.amazon || product.shopping_links?.flipkart || product.wiki_url

  return (
    <div className="product-card">
      {/* Product Image */}
      <div className="product-image-container">
        <img
          src={product.image_url || placeholderImage}
          alt={product.title}
          className="product-image"
          onError={(e) => {
            e.target.src = placeholderImage
          }}
        />
        <span className="source-badge">Wikipedia</span>
      </div>

      {/* Product Info */}
      <div className="product-info">
        <h4 className="product-title">{product.title}</h4>
        <p className="product-category">
          {product.category || 'Health Product'}
        </p>

        {product.description && (
          <p className="product-description">
            {product.description.substring(0, 100)}...
          </p>
        )}

        {/* Shopping Links */}
        <div className="shopping-links">
          {product.shopping_links?.amazon && (
            <a
              href={product.shopping_links.amazon}
              target="_blank"
              rel="noopener noreferrer"
              className="link-button amazon"
              title="Buy on Amazon"
            >
              <ExternalLink size={14} />
              Amazon
            </a>
          )}
          {product.shopping_links?.flipkart && (
            <a
              href={product.shopping_links.flipkart}
              target="_blank"
              rel="noopener noreferrer"
              className="link-button flipkart"
              title="Buy on Flipkart"
            >
              <ExternalLink size={14} />
              Flipkart
            </a>
          )}
          {product.wiki_url && (
            <a
              href={product.wiki_url}
              target="_blank"
              rel="noopener noreferrer"
              className="link-button wiki"
              title="Learn more on Wikipedia"
            >
              <ExternalLink size={14} />
              Learn More
            </a>
          )}
        </div>

        {/* Quantity Selector */}
        <div className="quantity-selector">
          <button
            className="qty-btn"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
          >
            <Minus size={14} />
          </button>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="qty-input"
          />
          <button className="qty-btn" onClick={() => setQuantity(quantity + 1)}>
            <Plus size={14} />
          </button>
        </div>

        {/* Add to Cart Button */}
        <button
          className="add-to-cart-btn"
          onClick={handleAddToCart}
          disabled={isAdding}
        >
          <ShoppingCart size={16} />
          {isAdding ? 'Adding...' : 'Add to Cart'}
        </button>

        {primaryShoppingUrl && (
          <a
            href={primaryShoppingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shop-now-link"
          >
            <ExternalLink size={14} />
            Buy Now
          </a>
        )}
      </div>
    </div>
  )
}
