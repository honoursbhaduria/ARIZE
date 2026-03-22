import { useState, useEffect } from 'react'
import { Trash2, ShoppingCart as CartIcon, Loader } from 'lucide-react'
import { getCartItems, removeFromCart, updateCartItem, clearCart } from '../services/api'
import '../styles/ShoppingCart.css'

export default function ShoppingCart() {
  const [cartItems, setCartItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadCart()
  }, [])

  const loadCart = async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await getCartItems()
      setCartItems(response.items || [])
    } catch (err) {
      setError(err.message || 'Failed to load cart')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateQuantity = async (itemId, newQuantity) => {
    if (newQuantity <= 0) return

    try {
      await updateCartItem(itemId, newQuantity)
      setCartItems(cartItems.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ))
    } catch (err) {
      setError(err.message || 'Failed to update quantity')
    }
  }

  const handleRemoveItem = async (itemId) => {
    try {
      await removeFromCart(itemId)
      setCartItems(cartItems.filter(item => item.id !== itemId))
    } catch (err) {
      setError(err.message || 'Failed to remove item')
    }
  }

  const handleClearCart = async () => {
    if (window.confirm('Are you sure you want to clear the cart?')) {
      try {
        await clearCart()
        setCartItems([])
      } catch (err) {
        setError(err.message || 'Failed to clear cart')
      }
    }
  }

  const totalPrice = cartItems.reduce((sum, item) => sum + (item.price_estimate || 0) * item.quantity, 0)
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="shopping-cart-container">
      <div className="cart-header">
        <h2><CartIcon size={20} /> Shopping Cart ({totalItems})</h2>
        {cartItems.length > 0 && (
          <button className="btn-secondary" onClick={handleClearCart}>
            Clear Cart
          </button>
        )}
      </div>

      {error && <p className="cart-error">{error}</p>}

      {isLoading ? (
        <div className="cart-loading"><Loader size={20} /> Loading cart...</div>
      ) : cartItems.length === 0 ? (
        <p className="cart-empty">Your cart is empty. Add items from shopping suggestions!</p>
      ) : (
        <>
          <div className="cart-items">
            {cartItems.map(item => (
              <div key={item.id} className="cart-item">
                <img
                  src={item.product_image || 'https://via.placeholder.com/80?text=No+Image'}
                  alt={item.product_name}
                  className="cart-item-image"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/80?text=No+Image'
                  }}
                />
                <div className="cart-item-details">
                  <h4>{item.product_name}</h4>
                  <p className="item-category">{item.product_category}</p>
                  {(item.amazon_url || item.flipkart_url || item.wikipedia_url) && (
                    <a
                      href={item.amazon_url || item.flipkart_url || item.wikipedia_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="item-link"
                    >
                      Open Shopping Link
                    </a>
                  )}
                </div>
                <div className="cart-item-quantity">
                  <button
                    className="qty-btn"
                    onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    className="qty-btn"
                    onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <button
                  className="btn-remove"
                  onClick={() => handleRemoveItem(item.id)}
                  title="Remove item"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="cart-footer">
            <div className="cart-summary">
              <p><strong>Total Items:</strong> {totalItems}</p>
              {totalPrice > 0 && (
                <p><strong>Estimated Total:</strong> ₹{totalPrice.toFixed(2)}</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
