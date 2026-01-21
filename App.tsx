
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
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import AdminPanel from './pages/AdminPanel';
import { Product, CartItem, User, Order } from './types';
import { MOCK_PRODUCTS, MOCK_ORDERS } from './constants';
import { supabase } from './services/supabaseClient';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  // Build a map of local images keyed by filename (without extension)
  const imageModules = import.meta.glob('./images/*.{png,jpg,jpeg,webp,JPG,PNG,WEBP}', { eager: true }) as Record<string, any>;
  const imageMap: Record<string, string> = {};
  for (const path in imageModules) {
    const url = imageModules[path]?.default || imageModules[path];
    const base = path.split('/').pop()?.replace(/\.[^/.]+$/, '');
    if (base && typeof url === 'string') imageMap[base] = url;
  }

  // Initialize products using matching local image by product name when available
  const [products, setProducts] = useState<Product[]>(
    MOCK_PRODUCTS.map(p => ({ ...p, image: imageMap[p.name] ?? p.image }))
  );

  // Ensure new images dropped into /images are applied without losing state
  const imageKeys = Object.keys(imageMap).join('|');
  useEffect(() => {
    setProducts(prev => prev.map(p => (
      imageMap[p.name] && p.image !== imageMap[p.name]
        ? { ...p, image: imageMap[p.name] }
        : p
    )));
  }, [imageKeys]);

  useEffect(() => {
    const savedUser = localStorage.getItem('dhimma_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('dhimma_user', JSON.stringify(u));
  };

  const handleLogout = () => {
    void supabase.auth.signOut();
    setUser(null);
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

  const addOrder = (order: Order) => {
    setOrders([order, ...orders]);
    setProducts(prev => prev.map(p => {
      const oi = order.items.find(i => i.id === p.id);
      return oi ? { ...p, stock: p.stock - oi.quantity } : p;
    }));
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
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/register" element={<Register onLogin={handleLogin} />} />
            <Route path="/dashboard/*" element={user ? <UserDashboard user={user} orders={orders.filter(o => o.userId === user.id)} onUpdateUser={handleUpdateUser} /> : <Navigate to="/login" />} />
            <Route path="/admin/*" element={user?.role === 'admin' ? <AdminPanel products={products} orders={orders} onUpdateProduct={(p) => setProducts(products.map(x => x.id === p.id ? p : x))} onUpdateOrder={(id, s) => setOrders(orders.map(o => o.id === id ? { ...o, status: s } : o))} /> : <Navigate to="/" />} />
          </Routes>
        </main>
        <MobileBottomNav />
        <WhatsAppButton />
      </div>
    </Router>
  );
};

export default App;
