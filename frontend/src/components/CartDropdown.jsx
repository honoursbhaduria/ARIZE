import { useState, useEffect } from 'react'
import { ShoppingCart, X } from 'lucide-react'
import { getCartItems } from '../services/api'
import '../styles/CartDropdown.css'

export default function CartDropdown() {
  const [cartCount, setCartCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    loadCartCount()
    // Reload cart count every 5 seconds or when component mounts
    const interval = setInterval(loadCartCount, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadCartCount = async () => {
    try {
      const response = await getCartItems()
      const count = response.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
      setCartCount(count)
    } catch (err) {
      // Silently fail - cart might not be available
    }
  }

  return (
    <div className="cart-dropdown">
      <button
        className="cart-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Shopping Cart"
      >
        <ShoppingCart size={20} />
        {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
      </button>

      {isOpen && (
        <div className="dropdown-overlay" onClick={() => setIsOpen(false)}>
          <div className="dropdown-content" onClick={(e) => e.stopPropagation()}>
            <div className="dropdown-header">
              <h3>Shopping Cart ({cartCount})</h3>
              <button className="btn-close" onClick={() => setIsOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <p className="dropdown-text">
              {cartCount > 0
                ? `You have ${cartCount} item${cartCount !== 1 ? 's' : ''} in your cart`
                : 'Your cart is empty'}
            </p>
            <a href="/shopping-cart" className="btn-primary" style={{ display: 'block', textAlign: 'center' }}>
              View Full Cart
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
