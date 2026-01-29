
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartItem, User, Order } from '../types';
import { createPreference, openCheckout } from '../services/mercadoPagoService';

interface CheckoutProps {
  cart: CartItem[];
  user: User | null;
  onComplete: (o: Order) => void;
  clearCart: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ cart, user, onComplete, clearCart }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    address: user?.addresses[0] || '',
    city: 'Monterrey',
    zip: '',
    deliveryMethod: 'shipping' as 'shipping' | 'pickup',
  });

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = formData.deliveryMethod === 'pickup' ? 0 : (subtotal > 5000 ? 0 : 250);
  const total = subtotal + shipping;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const generateOrderId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    const rand = Math.floor(Math.random() * 1_000_000);
    return `ord-${Date.now()}-${rand}`;
  };

  const handlePayWithMercadoPago = async () => {
    if (!formData.name || !formData.email) {
      alert('Por favor completa tu nombre y correo');
      return;
    }
    if (formData.deliveryMethod === 'shipping' && (!formData.address || !formData.zip)) {
      alert('Por favor completa todos los campos de envío');
      return;
    }

    setLoading(true);
    try {
      // Generate order ID (will be created by webhook after payment is approved)
      const orderId = generateOrderId();
      
      const orderData = {
        id: orderId,
        userId: user?.id || 'guest',
        userName: formData.name,
        userEmail: formData.email,
        items: cart,
        total: total,
        deliveryMethod: formData.deliveryMethod,
        shippingAddress: formData.deliveryMethod === 'pickup' 
          ? 'Recoger en tienda: AV DE LA JUVENTUD #590, San Nicolás de los Garza, NL'
          : `${formData.address}, ${formData.city}, CP ${formData.zip}`
      };
      
      // Store order details in session for waiting page
      sessionStorage.setItem('pendingOrderId', orderId);
      sessionStorage.setItem('orderData', JSON.stringify(orderData));

      // Send order data to backend for webhook to use
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        // Only send pending order data to backend; don't create order yet
        // Order will be created when webhook receives payment approval
        await fetch(`${backendUrl}/api/pending-orders/${orderId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        }).catch(err => console.warn('Failed to store pending order data:', err));
      } catch (err) {
        console.warn('⚠️ Could not store order on backend:', err);
        // Continue anyway; webhook will use defaults
      }

      // Create Mercado Pago preference with notification_url
      const preference = await createPreference(
        cart,
        { name: formData.name, email: formData.email },
        { 
          address: formData.deliveryMethod === 'pickup' ? 'AV DE LA JUVENTUD #590' : formData.address, 
          city: formData.deliveryMethod === 'pickup' ? 'San Nicolás de los Garza' : formData.city, 
          zip: formData.deliveryMethod === 'pickup' ? '66455' : formData.zip, 
          cost: shipping 
        },
        orderId
      );

      // Open Mercado Pago checkout in popup
      openCheckout(preference.id, () => {
        // Popup closed - navigate to waiting page where webhook will create the order
        console.log('Popup closed, navigating to waiting page...');
        navigate(`/checkout/waiting/${orderId}`);
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Error al procesar el pago. Por favor intenta de nuevo.');
      setLoading(false);
    }
  };

  // Redirect to cart if empty
  React.useEffect(() => {
    if (cart.length === 0 && step !== 3) {
      navigate('/cart');
    }
  }, [cart.length, step, navigate]);

  if (cart.length === 0 && step !== 3) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-12 relative">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2 z-0"></div>
        {[1, 2, 3].map(i => (
          <div key={i} className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${step >= i ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
            {i === 3 && step === 3 ? <i className="fas fa-check"></i> : i}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm animate-fadeIn">
          <h2 className="text-2xl font-bold mb-6">Datos de Entrega</h2>
          
          {/* Delivery Method Selector */}
          <div className="mb-8">
            <label className="text-sm font-bold text-slate-700 mb-3 block">Método de entrega</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, deliveryMethod: 'shipping' })}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  formData.deliveryMethod === 'shipping'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    formData.deliveryMethod === 'shipping' ? 'border-blue-600' : 'border-slate-300'
                  }`}>
                    {formData.deliveryMethod === 'shipping' && (
                      <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                      <i className="fas fa-truck text-blue-600"></i>
                      <span className="font-bold text-slate-800">Envío a domicilio</span>
                    </div>
                    <p className="text-xs text-slate-500">Recibe en tu dirección</p>
                    <p className="text-xs font-bold text-slate-600 mt-1">
                      {subtotal > 5000 ? 'Gratis' : '$250 MXN'}
                    </p>
                  </div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setFormData({ ...formData, deliveryMethod: 'pickup' })}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  formData.deliveryMethod === 'pickup'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    formData.deliveryMethod === 'pickup' ? 'border-blue-600' : 'border-slate-300'
                  }`}>
                    {formData.deliveryMethod === 'pickup' && (
                      <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                      <i className="fas fa-store text-blue-600"></i>
                      <span className="font-bold text-slate-800">Recoger en tienda</span>
                    </div>
                    <p className="text-xs text-slate-500">AV DE LA JUVENTUD #590</p>
                    <p className="text-xs text-slate-500">San Nicolás de los Garza, NL</p>
                    <p className="text-xs font-bold text-green-600 mt-1">Gratis</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Nombre completo</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </div>

          {/* Shipping Address (only shown if shipping is selected) */}
          {formData.deliveryMethod === 'shipping' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-slate-700">Dirección de envío</label>
                <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20" placeholder="Calle y número" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Ciudad</label>
                <input type="text" name="city" value={formData.city} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Código Postal</label>
                <input type="text" name="zip" value={formData.zip} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20" placeholder="66000" />
              </div>
            </div>
          )}
          
          <button onClick={() => setStep(2)} className="w-full mt-8 bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20">Siguiente: Pago</button>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm animate-fadeIn">
          <h2 className="text-2xl font-bold mb-6">Método de Pago</h2>
          
          {/* Mercado Pago Option */}
          <div className="space-y-4">
            <div className="border-2 border-blue-600 bg-blue-50 rounded-2xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-6 h-6 rounded-full bg-blue-600"></div>
                <div className="flex-grow">
                  <p className="font-bold text-slate-800 text-lg">Pagar con Mercado Pago</p>
                  <p className="text-sm text-slate-600">Tarjetas, transferencias y más opciones seguras</p>
                </div>
                <img src="https://http2.mlstatic.com/storage/logos-api-admin/a5f047d0-9be0-11ec-aad4-c3381f368aaf-m.svg" alt="Mercado Pago" className="h-8" />
              </div>
            </div>

            {/* Summary */}
            <div className="bg-slate-50 rounded-2xl p-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-bold text-slate-800">${subtotal.toLocaleString('es-MX')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Envío</span>
                <span className="font-bold text-slate-800">{shipping === 0 ? 'Gratis' : `$${shipping}`}</span>
              </div>
              <div className="border-t border-slate-200 pt-3 flex justify-between">
                <span className="font-black text-slate-900 text-lg">Total</span>
                <span className="font-black text-slate-900 text-2xl">${total.toLocaleString('es-MX')}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <button 
              onClick={() => setStep(1)} 
              className="flex-grow bg-slate-100 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              disabled={loading}
            >
              Atrás
            </button>
            <button 
              onClick={handlePayWithMercadoPago} 
              className="flex-grow bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Procesando...
                </>
              ) : (
                <>
                  <i className="fas fa-lock"></i>
                  Proceder al Pago
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="text-center bg-white rounded-3xl p-12 border border-slate-200 shadow-xl animate-scaleIn">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-check text-3xl"></i>
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">¡Pedido Confirmado!</h2>
          <p className="text-slate-500 mb-8">Gracias por confiar en Dhimma Automotriz. Recibirás un correo con los detalles de tu envío.</p>
          <div className="max-w-xs mx-auto space-y-4">
            <button onClick={() => navigate('/dashboard')} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl">Ver mis pedidos</button>
            <button onClick={() => navigate('/')} className="w-full text-blue-600 font-bold py-3">Volver al inicio</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
