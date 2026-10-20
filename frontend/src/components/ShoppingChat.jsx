import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Send, ShoppingCart } from 'lucide-react'
import { shoppingChat } from '../services/api'
import { logActivity } from '../services/activityFeed'
import { useCartMutations } from '../lib/queries'
import { Button } from '../ui/components'
import { useToast } from '../ui/toast-context'
import ShoppingProductCard from './ShoppingProductCard'

const EXAMPLES = ['Diet coke', 'Products like whey protein', 'Vegan snack options']

export default function ShoppingChat() {
  const toast = useToast()
  const { add } = useCartMutations()
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const logRef = useRef(null)

  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' })
  }, [messages, isLoading])

  const push = (message) => setMessages((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, ...message }])

  const send = async (text = inputValue) => {
    const userMessage = text.trim()
    if (!userMessage || isLoading) return
    push({ type: 'user', text: userMessage })
    setInputValue('')
    setIsLoading(true)
    try {
      const response = await shoppingChat(userMessage)
      if (response.error) push({ type: 'error', text: response.error })
      else push({ type: 'ai', text: response.ai_message, products: response.products || [] })
    } catch (err) {
      push({ type: 'error', text: err.message || 'Failed to get response' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddToCart = async (productData) => {
    try {
      await add.mutateAsync(productData)
      toast.success(`${productData.product_name} added to your wish list`)
      logActivity({
        source: 'Nutrition & Shopping',
        action: 'Item added to cart',
        details: `${productData.product_name} x${productData.quantity}`,
        meta: { productName: productData.product_name, quantity: productData.quantity },
      })
    } catch (err) {
      toast.error(err.message || 'Failed to add to cart')
    }
  }

  return (
    <div className="stack grow" style={{ minHeight: 0 }}>
      <div className="chat-log grow" ref={logRef} style={{ minHeight: 260, maxHeight: 620 }}>
        {messages.length === 0 && (
          <div className="empty" style={{ margin: 'auto' }}>
            <ShoppingCart size={38} strokeWidth={1.5} />
            <p className="small">Ask for a product and get cards with images and buy links.</p>
            <div className="row-wrap" style={{ justifyContent: 'center' }}>
              {EXAMPLES.map((example) => (
                <button key={example} type="button" className="chip" onClick={() => send(example)}>{example}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="stack-sm">
            <div className={`bubble ${msg.type === 'user' ? 'bubble--user' : msg.type === 'error' ? 'bubble--error' : 'bubble--ai'}`}>{msg.text}</div>
            {msg.products?.length > 0 && (
              <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(190px, 100%), 1fr))', gap: 12 }}>
                {msg.products.map((product, index) => (
                  <ShoppingProductCard
                    key={`${product.title}-${index}`}
                    product={{
                      title: product.title,
                      image_url: product.image_url || product.image,
                      category: product.category,
                      description: product.description,
                      wiki_url: product.wiki_url || product.url,
                      shopping_links: product.shopping_links || { amazon: product.amazon_url, flipkart: product.flipkart_url },
                    }}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
        {isLoading && <div className="bubble bubble--ai row" style={{ gap: 10 }}><span className="spinner" /> Searching products…</div>}
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <input className="input" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Ask about health products…" disabled={isLoading} aria-label="Ask the shopping assistant" />
        <Button type="submit" variant="primary" icon={Send} loading={isLoading} disabled={!inputValue.trim()} aria-label="Send" />
      </form>
      <Link to="/shopping-cart" className="link small" style={{ alignSelf: 'flex-end' }}>Open wish list →</Link>
    </div>
  )
}
