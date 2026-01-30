
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import MobileBottomNav from './components/MobileBottomNav';
import WhatsAppButton from './components/WhatsAppButton';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import AboutUs from './pages/AboutUs';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import CheckoutWaiting from './pages/CheckoutWaiting';
import CheckoutSuccess from './pages/CheckoutSuccess';
import CheckoutFailure from './pages/CheckoutFailure';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import UserDashboard from './pages/UserDashboard';
import AdminPanel from './pages/AdminPanel';
import { Product, CartItem, User, Order } from './types';
import { MOCK_PRODUCTS, MOCK_ORDERS } from './constants';
import { supabase } from './services/supabaseClient';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Build a map of local images keyed by filename (without extension)
  const imageModules = import.meta.glob('./images/*.{png,jpg,jpeg,webp,JPG,PNG,WEBP}', { eager: true }) as Record<string, any>;
  const imageMap: Record<string, string> = {};
  for (const path in imageModules) {
    const url = imageModules[path]?.default || imageModules[path];
    const base = path.split('/').pop()?.replace(/\.[^/.]+$/, '');
    if (base && typeof url === 'string') imageMap[base] = url;
  }

  // Normalize status values (Spanish/English/upper) to canonical lowercase
  const normalizeStatus = (status: string) => {
    const s = (status || '').toString().toLowerCase();
    if (['pendiente', 'pending'].includes(s)) return 'pendiente';
    if (['pagado', 'paid', 'approved', 'aprobado'].includes(s)) return 'pagado';
    if (['enviado', 'shipped'].includes(s)) return 'enviado';
    if (['completado', 'completed'].includes(s)) return 'completado';
    if (['rechazado', 'rejected'].includes(s)) return 'rejected';
    return s || 'pendiente';
  };

  const fetchOrders = async (userId: string) => {
    // Fetch via backend (uses service role) to bypass RLS restrictions
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    const resp = await fetch(`${backendUrl}/api/user-orders/${userId}`);
    if (!resp.ok) {
      console.error('Failed to fetch orders from backend', resp.status);
      setOrders([]);
      return;
    }
    const ordersData = await resp.json();

    const parsedOrders = (ordersData || []).map((o: any) => ({
      id: o.id,
      userId: o.user_id,
      userName: o.user_name,
      userEmail: o.user_email,
      items: o.items || [],
      total: parseFloat(o.total),
      status: normalizeStatus(o.status),
      date: o.created_at,
      shippingAddress: o.shipping_address
    }));

    console.log('[orders] fetched for user', userId, 'count', parsedOrders.length);
    setOrders(parsedOrders);
  };

  const fetchAllOrders = async () => {
    // Fetch all orders for admin (uses service role)
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    console.log('[orders] fetching all orders from:', backendUrl);
    try {
      const resp = await fetch(`${backendUrl}/api/all-orders`);
      if (!resp.ok) {
        console.error('Failed to fetch all orders from backend', resp.status, resp.statusText);
        const errorText = await resp.text();
        console.error('Error response:', errorText);
        setOrders([]);
        return;
      }
      const ordersData = await resp.json();
      console.log('[orders] raw data from backend:', ordersData);
      console.log('[orders] backend returned count:', (ordersData || []).length);

      const parsedOrders = (ordersData || []).map((o: any) => ({
        id: o.id,
        userId: o.user_id,
        userName: o.user_name,
        userEmail: o.user_email,
        items: typeof o.items === 'string' ? JSON.parse(o.items || '[]') : (o.items || []),
        total: parseFloat(o.total),
        status: normalizeStatus(o.status),
        date: o.created_at,
        shippingAddress: o.shipping_address
      }));

      console.log('[orders] fetched all orders for admin, count', parsedOrders.length);
      setOrders(parsedOrders);
    } catch (err) {
      console.error('[orders] Exception fetching all orders:', err);
      setOrders([]);
    }
  };

  // Fetch products and orders on mount; refresh orders on auth changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch products through backend to bypass RLS (uses service role when available)
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        console.log('[products] fetching from:', backendUrl);
        const prodResp = await fetch(`${backendUrl}/api/products`);
        if (!prodResp.ok) {
          console.error('[products] fetch failed', prodResp.status, prodResp.statusText);
          const errText = await prodResp.text();
          console.error('[products] error response:', errText);
          throw new Error('products fetch failed');
        }
        const productsData = await prodResp.json();

        const productsWithImages = (productsData || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          brand: p.brand,
          compatibleModels: p.compatible_models || [],
          price: parseFloat(p.price),
          stock: p.stock,
          image: imageMap[p.name] || p.image,
          description: p.description || ''
        }));
        console.log('[products] parsed count:', productsWithImages.length);
        setProducts(productsWithImages);

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          // Check if user is admin from profile
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('role, addresses')
              .eq('id', session.user.id)
              .single();
            
            if (profileError) {
              console.error('[auth] profile fetch error (initial):', profileError.message);
            }

            console.log('[auth] User:', session.user.id, 'Email:', session.user.email, 'Profile:', profile, 'Role:', profile?.role, 'UserStateRole:', user?.role);
            
            const isAdmin = profile?.role === 'admin' || user?.role === 'admin';
            if (isAdmin) {
              console.log('[auth] User is admin (initial), fetching all orders');
              await fetchAllOrders();
            } else {
              console.log('[auth] User is not admin (initial), fetching user orders only');
              await fetchOrders(session.user.id);
            }

            // Update user state with addresses from database
            if (profile?.addresses && Array.isArray(profile.addresses)) {
              setUser(prevUser => prevUser ? { ...prevUser, addresses: profile.addresses } : null);
            }
          } catch (err) {
            console.error('[auth] profile fetch exception (initial):', err);
            // Fallback: if local user state says admin, still fetch all orders
            if (user?.role === 'admin') {
              console.log('[auth] Fallback: user state is admin, fetching all orders');
              await fetchAllOrders();
            } else {
              await fetchOrders(session.user.id);
            }
          }
        } else {
          console.log('[auth] No session found');
          // Fallback: use saved local user (role/id) to fetch
          const savedUserRaw = localStorage.getItem('dhimma_user');
          if (savedUserRaw) {
            try {
              const saved = JSON.parse(savedUserRaw) as User;
              console.log('[auth] Using local user fallback:', saved.id, saved.role);
              if (saved.role === 'admin') {
                await fetchAllOrders();
              } else if (saved.id) {
                await fetchOrders(saved.id);
              }
            } catch (e) {
              console.error('[auth] Failed to parse local user fallback', e);
              setOrders([]);
            }
          } else {
            setOrders([]);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setProducts(MOCK_PRODUCTS.map(p => ({ ...p, image: imageMap[p.name] ?? p.image })));
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user?.id) {
        console.log('[auth] change user', session.user.id);
        // Check if user is admin
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          if (profileError) {
            console.error('[auth] profile fetch error (state change):', profileError.message);
          }
          
          console.log('[auth] Profile in state change:', profile, 'Role:', profile?.role, 'UserStateRole:', user?.role);
          
          const isAdmin = profile?.role === 'admin' || user?.role === 'admin';
          if (isAdmin) {
            console.log('[auth] User is admin (state change), fetching all orders');
            await fetchAllOrders();
          } else {
            console.log('[auth] User is not admin (state change), fetching user orders');
            await fetchOrders(session.user.id);
          }
        } catch (err) {
          console.error('[auth] profile fetch exception (state change):', err);
          if (user?.role === 'admin') {
            console.log('[auth] Fallback: user state is admin (state change), fetching all orders');
            await fetchAllOrders();
          } else {
            await fetchOrders(session.user.id);
          }
        }
      } else {
        console.log('[auth] No session in state change');
        // Fallback: use saved local user (role/id) to fetch
        const savedUserRaw = localStorage.getItem('dhimma_user');
        if (savedUserRaw) {
          try {
            const saved = JSON.parse(savedUserRaw) as User;
            console.log('[auth] Using local user fallback (state change):', saved.id, saved.role);
            if (saved.role === 'admin') {
              await fetchAllOrders();
            } else if (saved.id) {
              await fetchOrders(saved.id);
            }
          } catch (e) {
            console.error('[auth] Failed to parse local user fallback (state change)', e);
            setOrders([]);
          }
        } else {
          setOrders([]);
        }
      }
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  // Re-fetch orders whenever user changes (especially admin) using local user fallback
  useEffect(() => {
    const run = async () => {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      if (user?.role === 'admin') {
        console.log('[orders] user effect: admin -> fetch all orders from', backendUrl);
        await fetchAllOrders();
      } else if (user?.id) {
        console.log('[orders] user effect: user -> fetch own orders', user.id, 'from', backendUrl);
        await fetchOrders(user.id);
      }
    };
    run();
  }, [user?.id, user?.role]);

  // Restore user from localStorage on first load
  useEffect(() => {
    const savedUser = localStorage.getItem('dhimma_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        console.log('[app] Restored user from localStorage:', parsed);
        setUser(parsed);
      } catch (e) {
        console.error('Error parsing saved user', e);
      }
    }
  }, []);

  // Watch for product refresh flag (set after successful payment to update stock)
  useEffect(() => {
    const checkRefresh = () => {
      const refreshFlag = sessionStorage.getItem('refreshProducts');
      if (refreshFlag === 'true') {
        console.log('[products] Refreshing due to payment success');
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        fetch(`${backendUrl}/api/products`)
          .then(res => res.json())
          .then(productsData => {
            const productsWithImages = (productsData || []).map((p: any) => ({
              id: p.id,
              name: p.name,
              category: p.category,
              brand: p.brand,
              compatibleModels: p.compatible_models || [],
              price: parseFloat(p.price),
              stock: p.stock,
              image: imageMap[p.name] || p.image,
              description: p.description || ''
            }));
            setProducts(productsWithImages);
            console.log('[products] refreshed, new stock values loaded');
            sessionStorage.removeItem('refreshProducts');
          })
          .catch(err => console.error('[products] refresh failed:', err));
      }
    };

    // Check immediately
    checkRefresh();
    
    // Also check every 2 seconds while on success page
    const interval = setInterval(checkRefresh, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('dhimma_user', JSON.stringify(u));
  };

  const handleLogout = () => {
    void supabase.auth.signOut();
    setUser(null);
    setOrders([]);
    localStorage.removeItem('dhimma_user');
  };

  const handleUpdateUser = async (updated: User) => {
    console.log('🔄 handleUpdateUser called with addresses:', updated.addresses?.length || 0, 'addresses');
    setUser(updated);
    localStorage.setItem('dhimma_user', JSON.stringify(updated));

    // Save addresses to database if user is logged in
    if (updated.id && updated.addresses) {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        console.log('📤 Sending addresses to backend:', backendUrl, 'User ID:', updated.id);
        const response = await fetch(`${backendUrl}/api/user-addresses/${updated.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addresses: updated.addresses })
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Addresses saved to database:', result);
        } else {
          const errorText = await response.text();
          console.error('⚠️ Failed to save addresses to database:', response.statusText, errorText);
        }
      } catch (err) {
        console.error('❌ Could not save addresses to database:', err);
        // Still update locally even if database save fails
      }
    } else {
      console.log('⚠️ Not saving addresses - User ID:', updated.id, 'Has addresses:', !!updated.addresses);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id !== id) return item;
      const cartItem = cart.find(c => c.id === id);
      const product = products.find(p => p.id === id);
      const newQuantity = cartItem ? cartItem.quantity + delta : 1;
      // Don't allow quantity to exceed available stock
      const maxQuantity = product?.stock || 0;
      const finalQuantity = Math.max(1, Math.min(newQuantity, maxQuantity));
      return { ...item, quantity: finalQuantity };
    }));
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.id !== id));

  const addOrder = async (order: Order) => {
    // Save to Supabase
    try {
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          id: order.id,
          user_id: order.userId,
          user_name: order.userName,
          user_email: order.userEmail,
          items: order.items,
          total: order.total,
          status: order.status,
          shipping_address: order.shippingAddress
        });

      if (orderError) throw orderError;

      // Update local state
      setOrders([order, ...orders]);
    } catch (err) {
      console.error('Error saving order:', err);
      alert('Error al guardar el pedido. Por favor intenta de nuevo.');
      return;
    }

    // Update stock in Supabase and local state
    order.items.forEach(async (item) => {
      try {
        await supabase
          .from('products')
          .update({ stock: item.stock - item.quantity })
          .eq('id', item.id);
      } catch (err) {
        console.error('Error updating stock:', err);
      }
    });

    setProducts(prev => prev.map(p => {
      const oi = order.items.find(i => i.id === p.id);
      return oi ? { ...p, stock: p.stock - oi.quantity } : p;
    }));
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    if (!user) {
      alert('You must be logged in to update products.');
      return;
    }

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const resp = await fetch(`${backendUrl}/api/products/${updatedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updatedProduct, updated_by_admin_id: user.id })
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText || 'Failed to update product');
      }

      // Update local state
      setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    } catch (err) {
      console.error('Error updating product:', err);
      alert('Error al actualizar el producto. Por favor intenta de nuevo.');
    }
  };

  const uploadProductImage = async (file: File) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    const formData = new FormData();
    formData.append('file', file);

    const resp = await fetch(`${backendUrl}/api/uploads/product-image`, {
      method: 'POST',
      body: formData
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(errText || 'Failed to upload image');
    }

    const data = await resp.json();
    if (!data?.url) throw new Error('Invalid image upload response');
    return data.url as string;
  };

  const handleCreateProduct = async (newProduct: Product) => {
    if (!user) {
      alert('You must be logged in to create products.');
      return;
    }

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const resp = await fetch(`${backendUrl}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newProduct, updated_by_admin_id: user.id })
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText || 'Failed to create product');
      }

      const created = await resp.json();
      const mapped: Product = {
        id: created.id,
        name: created.name,
        category: created.category,
        brand: created.brand,
        compatibleModels: created.compatible_models || [],
        price: parseFloat(created.price),
        stock: created.stock,
        image: imageMap[created.name] || created.image,
        description: created.description || ''
      };

      setProducts(prev => [mapped, ...prev]);
    } catch (err) {
      console.error('Error creating product:', err);
      alert('Error al crear el producto. Por favor intenta de nuevo.');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!user) {
      alert('You must be logged in to delete products.');
      return;
    }

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const resp = await fetch(`${backendUrl}/api/products/${id}`, {
        method: 'DELETE'
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText || 'Failed to delete product');
      }

      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting product:', err);
      alert('Error al eliminar el producto. Por favor intenta de nuevo.');
    }
  };

  const handleUpdateOrder = async (orderId: string, newStatus: string) => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const resp = await fetch(`${backendUrl}/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText || 'Failed to update order');
      }

      // Update local state
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (err) {
      console.error('Error updating order:', err);
      alert('Error al actualizar el pedido. Por favor intenta de nuevo.');
    }
  };

  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Header user={user} onLogout={handleLogout} cartCount={cart.length} />
        <main className="flex-grow pb-20 md:pb-0">
          <Routes>
            <Route path="/" element={<Home products={products} onAddToCart={addToCart} />} />
            <Route path="/catalog" element={<Catalog products={products} onAddToCart={addToCart} />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/product/:id" element={<ProductDetail products={products} onAddToCart={addToCart} />} />
            <Route path="/cart" element={<Cart cart={cart} updateQuantity={updateQuantity} remove={removeFromCart} />} />
            <Route path="/checkout" element={<Checkout cart={cart} user={user} onComplete={addOrder} clearCart={() => setCart([])} />} />
            <Route path="/checkout/waiting/:orderId" element={<CheckoutWaiting />} />
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
            <Route path="/checkout/failure" element={<CheckoutFailure />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/register" element={<Register onLogin={handleLogin} />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard/*" element={user ? <UserDashboard user={user} orders={orders.filter(o => o.userId === user.id)} onUpdateUser={handleUpdateUser} /> : <Navigate to="/login" />} />
            <Route path="/admin/*" element={user?.role === 'admin' ? <AdminPanel products={products} orders={orders} onUpdateProduct={handleUpdateProduct} onUpdateOrder={handleUpdateOrder} onCreateProduct={handleCreateProduct} onDeleteProduct={handleDeleteProduct} onUploadProductImage={uploadProductImage} /> : <Navigate to="/" />} />
          </Routes>
        </main>
        <MobileBottomNav />
        <WhatsAppButton />
      </div>
    </Router>
  );
};

export default App;
