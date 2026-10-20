import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { cartQuery, useCartMutations } from '../lib/queries'
import { PRODUCT_PLACEHOLDER } from '../lib/placeholder'
import { Alert, Button, Card, EmptyState, PageHeader, Skeleton } from '../ui/components'
import { ConfirmDialog } from '../ui/Modal'
import { useToast } from '../ui/toast-context'

export default function Cart() {
  const toast = useToast()
  const cart = useQuery(cartQuery)
  const { remove, update, clear } = useCartMutations()
  const [confirmClear, setConfirmClear] = useState(false)

  const items = cart.data || []
  const totalItems = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  const totalPrice = items.reduce((sum, item) => sum + Number(item.price_estimate || 0) * Number(item.quantity || 0), 0)

  const onError = (err) => toast.error(err.message || 'Could not update your wish list')

  return (
    <div className="page">
      <PageHeader
        eyebrow="Loot"
        title="Wish List"
        subtitle={`${totalItems} item${totalItems === 1 ? '' : 's'} saved from the shopping assistant.`}
        action={items.length > 0 && <Button variant="ghost" icon={Trash2} onClick={() => setConfirmClear(true)}>Clear all</Button>}
      />

      {cart.isError && <Alert tone="error">{cart.error?.message || 'Failed to load cart'}</Alert>}

      {cart.isLoading ? (
        <div className="list">{[0, 1, 2].map((i) => <Skeleton key={i} height={92} />)}</div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={ShoppingCart}
            title="Your wish list is empty"
            action={<Link to="/nutrition" className="btn btn--primary">Find products</Link>}
          >
            Ask the AI shopping assistant on the Nutrition page and add products here.
          </EmptyState>
        </Card>
      ) : (
        <div className="split">
          <ul className="list">
            {items.map((item) => {
              const link = item.amazon_url || item.flipkart_url || item.wikipedia_url
              return (
                <li key={item.id} className="card" style={{ padding: 14 }}>
                  <div className="row" style={{ alignItems: 'flex-start' }}>
                    <img
                      src={item.product_image || PRODUCT_PLACEHOLDER}
                      alt=""
                      onError={(e) => { e.currentTarget.src = PRODUCT_PLACEHOLDER }}
                      style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div className="grow stack-sm" style={{ gap: 4 }}>
                      <strong className="truncate">{item.product_name}</strong>
                      <span className="tiny muted">{item.product_category}</span>
                      {link && (
                        <a href={link} target="_blank" rel="noopener noreferrer" className="link tiny">
                          Open shopping link <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    <button
                      type="button"
                      className="icon-btn icon-btn--danger"
                      aria-label={`Remove ${item.product_name}`}
                      onClick={() => remove.mutate(item.id, { onError })}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="spread" style={{ marginTop: 10 }}>
                    <span className="tiny dim">Quantity</span>
                    <div className="row" style={{ gap: 4 }}>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="Decrease quantity"
                        disabled={item.quantity <= 1}
                        onClick={() => update.mutate({ itemId: item.id, quantity: item.quantity - 1 }, { onError })}
                      >
                        <Minus size={16} />
                      </button>
                      <span className="mono" style={{ minWidth: 24, textAlign: 'center' }}>{item.quantity}</span>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="Increase quantity"
                        onClick={() => update.mutate({ itemId: item.id, quantity: item.quantity + 1 }, { onError })}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          <Card tone="gold" className="stack">
            <span className="eyebrow">Summary</span>
            <div className="spread"><span className="muted">Total items</span><span className="mono">{totalItems}</span></div>
            {totalPrice > 0 && <div className="spread"><span className="muted">Estimated total</span><span className="mono">₹{totalPrice.toFixed(2)}</span></div>}
            <Link to="/nutrition" className="btn btn--ghost btn--block">Keep shopping</Link>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={confirmClear}
        title="Clear your wish list?"
        message="All saved products will be removed."
        confirmLabel="Clear all"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          clear.mutate(undefined, { onError })
          setConfirmClear(false)
        }}
      />
    </div>
  )
}
