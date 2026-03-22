import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Send, Loader, ShoppingCart } from 'lucide-react'
import { shoppingChat, addToCart } from '../services/api'
import ShoppingProductCard from './ShoppingProductCard'
import '../styles/ShoppingChat.css'

export default function ShoppingChat() {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    // Add user message to chat
    const userMessage = inputValue.trim()
    setMessages(prev => [...prev, { type: 'user', text: userMessage, id: Date.now() }])
    setInputValue('')
    setError('')
    setStatusMessage('')
    setIsLoading(true)

    try {
      const response = await shoppingChat(userMessage)

      if (response.error) {
        setError(response.error)
        setMessages(prev => [...prev, {
          type: 'error',
          text: response.error,
          id: Date.now()
        }])
      } else {
        // Add AI response
        setMessages(prev => [...prev, {
          type: 'ai',
          text: response.ai_message,
          products: response.products || [],
          id: Date.now()
        }])
      }
    } catch (err) {
      const errMsg = err.message || 'Failed to get response'
      setError(errMsg)
      setMessages(prev => [...prev, {
        type: 'error',
        text: errMsg,
        id: Date.now()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddToCart = async (productData) => {
    setError('')
    setStatusMessage('')
    try {
      await addToCart(productData)
      setStatusMessage('Item added to cart.')
    } catch (err) {
      setError(err.message || 'Failed to add to cart')
    }
  }

  return (
    <div className="shopping-chat-container">
      <div className="chat-header">
        <div className="chat-header-info">
          <h3>Shopping AI Assistant</h3>
          <p>Find products and buy links.</p>
        </div>
        <Link to="/shopping-cart" className="chat-cart-link">Open Cart</Link>
      </div>

      {statusMessage && (
        <div className="chat-status">{statusMessage}</div>
      )}

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <ShoppingCart size={40} opacity="0.3" />
            <p>Ask for a product and I will return shopping cards with images and buy links.</p>
            <ul style={{ textAlign: 'left', fontSize: '0.9rem', color: '#666', marginTop: '12px' }}>
              <li>Example: "give me diet coke"</li>
              <li>Example: "show me products similar to whey protein"</li>
              <li>Example: "find vegan snack options"</li>
            </ul>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`message message-${msg.type}`}>
            {msg.type === 'error' ? (
              <div className="message-text error-text">{msg.text}</div>
            ) : msg.type === 'user' ? (
              <div className="message-text">{msg.text}</div>
            ) : (
              <>
                <div className="message-text">{msg.text}</div>
                {msg.products && msg.products.length > 0 && (
                  <div className="message-products">
                    {msg.products.map((product, idx) => (
                      <ShoppingProductCard
                        key={idx}
                        product={{
                          title: product.title,
                          image_url: product.image_url || product.image,
                          category: product.category,
                          description: product.description,
                          wiki_url: product.wiki_url || product.url,
                          shopping_links: product.shopping_links || {
                            amazon: product.amazon_url,
                            flipkart: product.flipkart_url,
                          }
                        }}
                        onAddToCart={handleAddToCart}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="message message-loading">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Loader size={16} className="spinner" />
              <span>Groq is thinking and searching Wikipedia...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="ask me about the health products..."
          disabled={isLoading}
          className="chat-input"
        />
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="chat-send-btn"
        >
          {isLoading ? <Loader size={16} /> : <Send size={16} />}
        </button>
      </form>
    </div>
  )
}
