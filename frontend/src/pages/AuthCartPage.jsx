import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { ShoppingBagIcon } from '../components/Icons';

export default function AuthCartPage() {
  const [cart, setCart] = useState({ items: [], subtotal: 0, item_count: 0 });
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchCart();
  }, [navigate]);

  const syncLocalStorage = (cartItems) => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const formatted = (cartItems || []).map((it) => ({
        product_id: it.product_id,
        name: it.product_name || it.name,
        variant_id: it.variant_id,
        sku: it.sku,
        attribute_name: it.attribute_name,
        attribute_value: it.attribute_value,
        price: it.unit_price,
        quantity: it.quantity,
      }));
      if (user?.user_id) {
        localStorage.setItem(`cart_${user.user_id}`, JSON.stringify(formatted));
      }
      localStorage.setItem('cart', JSON.stringify(formatted));
    } catch {
      // ignore
    }
  };

  const fetchCart = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/auth_cart/cart');
      setCart(res.data);
      syncLocalStorage(res.data.items);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to retrieve shopping cart items.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (cartItemId, newQty) => {
    try {
      setUpdatingId(cartItemId);
      if (newQty <= 0) {
        await api.delete(`/auth_cart/cart/items/${cartItemId}`);
      } else {
        await api.put(`/auth_cart/cart/items/${cartItemId}`, { quantity: newQty });
      }
      const res = await api.get('/auth_cart/cart');
      setCart(res.data);
      syncLocalStorage(res.data.items);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update item quantity.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemoveItem = async (cartItemId) => {
    try {
      setUpdatingId(cartItemId);
      await api.delete(`/auth_cart/cart/items/${cartItemId}`);
      const res = await api.get('/auth_cart/cart');
      setCart(res.data);
      syncLocalStorage(res.data.items);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove item.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleClearCart = async () => {
    if (!window.confirm('Are you sure you want to clear your entire cart?')) return;
    try {
      setLoading(true);
      await api.delete('/auth_cart/cart/clear');
      const res = await api.get('/auth_cart/cart');
      setCart(res.data);
      syncLocalStorage(res.data.items);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to clear cart.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && cart.items.length === 0) {
    return (
      <div className="card" style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center', padding: '48px 24px' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading your shopping cart...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1060px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Shopping Cart</h2>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Review items in your personal cart before proceeding to checkout.
          </p>
        </div>
        {cart.items.length > 0 && (
          <button
            onClick={handleClearCart}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--danger)',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500,
            }}
          >
            Clear Cart
          </button>
        )}
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {cart.items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: 'var(--primary)',
            }}
          >
            <ShoppingBagIcon style={{ width: '32px', height: '32px' }} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>Your cart is empty</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px', maxWidth: '380px', margin: '0 auto 20px auto' }}>
            Explore our product catalog to discover and add available inventory to your cart.
          </p>
          <Link
            to="/catalog"
            className="btn-primary"
            style={{ textDecoration: 'none', display: 'inline-flex', padding: '10px 20px', borderRadius: '8px' }}
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)', gap: '24px', alignItems: 'start' }}>
          {/* Cart Items List */}
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Product Details</span>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Price</span>
            </div>

            {cart.items.map((item) => (
              <div
                key={item.cart_item_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '16px',
                  paddingBottom: '20px',
                  borderBottom: '1px solid var(--border-light)',
                  opacity: updatingId === item.cart_item_id ? 0.6 : 1,
                  transition: 'opacity 0.2s ease',
                }}
              >
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{item.product_name}</h4>
                  <div style={{ margin: '4px 0 8px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {item.attribute_name && (
                      <span style={{ marginRight: '8px' }}>
                        {item.attribute_name}: <strong>{item.attribute_value}</strong>
                      </span>
                    )}
                    <span>SKU: {item.sku}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                    {/* Quantity controls */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.cart_item_id, item.quantity - 1)}
                        disabled={updatingId === item.cart_item_id}
                        style={{
                          background: 'var(--bg-subtle)',
                          border: 'none',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '1rem',
                        }}
                      >
                        −
                      </button>
                      <span style={{ padding: '0 14px', fontWeight: 600, fontSize: '0.9rem' }}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.cart_item_id, item.quantity + 1)}
                        disabled={updatingId === item.cart_item_id}
                        style={{
                          background: 'var(--bg-subtle)',
                          border: 'none',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '1rem',
                        }}
                      >
                        +
                      </button>
                    </div>

                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      × ${parseFloat(item.unit_price).toFixed(2)} each
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.cart_item_id)}
                      disabled={updatingId === item.cart_item_id}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        marginLeft: '8px',
                        textDecoration: 'underline',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    ${parseFloat(item.total_price).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
              Order Summary
            </h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Items</span>
              <span style={{ fontWeight: 600 }}>{cart.item_count}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
              <span style={{ fontWeight: 700, fontSize: '1.15rem' }}>${parseFloat(cart.subtotal).toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Estimated Tax</span>
              <span style={{ color: 'var(--text-muted)' }}>Calculated at checkout</span>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: '1.35rem', color: 'var(--primary)' }}>
                ${parseFloat(cart.subtotal).toFixed(2)}
              </span>
            </div>

            <Link
              to="/orders"
              className="btn-primary"
              style={{
                textAlign: 'center',
                textDecoration: 'none',
                padding: '12px 20px',
                borderRadius: '8px',
                fontWeight: 600,
                marginTop: '8px',
              }}
            >
              Proceed to Orders / Checkout
            </Link>

            <Link
              to="/catalog"
              style={{
                textAlign: 'center',
                textDecoration: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.875rem',
              }}
            >
              ← Continue Shopping
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
