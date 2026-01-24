
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import MobileBottomNav from './components/MobileBottomNav';
import WhatsAppButton from './components/WhatsAppButton';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
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
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (productsError) throw productsError;

        const productsWithImages = (productsData || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          brand: p.brand,
          compatibleModels: p.compatible_models || [],
          price: parseFloat(p.price),
          stock: p.stock,
          image: imageMap[p.name] || p.image,
          description: p.description || '',
          estado: p.estado || ''
        }));

        setProducts(productsWithImages);

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          // Check if user is admin from profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          console.log('[auth] User:', session.user.id, 'Email:', session.user.email, 'Profile:', profile, 'Role:', profile?.role);
          
          if (profile?.role === 'admin') {
            console.log('[auth] User is admin, fetching all orders');
            await fetchAllOrders();
          } else {
            console.log('[auth] User is not admin, fetching user orders only');
            await fetchOrders(session.user.id);
          }
        } else {
          console.log('[auth] No session found');
          setOrders([]);
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
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        console.log('[auth] Profile in state change:', profile, 'Role:', profile?.role);
        
        if (profile?.role === 'admin') {
          console.log('[auth] User is admin (state change), fetching all orders');
          await fetchAllOrders();
        } else {
          console.log('[auth] User is not admin (state change), fetching user orders');
          await fetchOrders(session.user.id);
        }
      } else {
        console.log('[auth] No session in state change');
        setOrders([]);
      }
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

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

  const handleUpdateUser = (updated: User) => {
    setUser(updated);
    localStorage.setItem('dhimma_user', JSON.stringify(updated));
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
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item));
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
      const { error } = await supabase
        .from('products')
        .update({
          name: updatedProduct.name,
          category: updatedProduct.category,
          brand: updatedProduct.brand,
          compatible_models: updatedProduct.compatibleModels,
          price: updatedProduct.price,
          stock: updatedProduct.stock,
          image: updatedProduct.image,
          description: updatedProduct.description,
          estado: updatedProduct.estado,
          updated_by_admin_id: user.id
        })
        .eq('id', updatedProduct.id);

      if (error) throw error;

      // Update local state
      setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    } catch (err) {
      console.error('Error updating product:', err);
      alert('Error al actualizar el producto. Por favor intenta de nuevo.');
    }
  };

  const handleUpdateOrder = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

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
            <Route path="/admin/*" element={user?.role === 'admin' ? <AdminPanel products={products} orders={orders} onUpdateProduct={handleUpdateProduct} onUpdateOrder={handleUpdateOrder} /> : <Navigate to="/" />} />
          </Routes>
        </main>
        <MobileBottomNav />
        <WhatsAppButton />
      </div>
    </Router>
  );
};

export default App;
