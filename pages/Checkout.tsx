
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
  const [errorMessage, setErrorMessage] = useState('');
  const [errorFields, setErrorFields] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    address: user?.addresses[0] || '',
    city: 'Monterrey',
    state: '',
    zip: '',
    deliveryMethod: 'shipping' as 'shipping' | 'pickup',
    pickupLocation: 'AV DE LA JUVENTUD #590, San Nicolás de los Garza, NL',
  });

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = formData.deliveryMethod === 'pickup' ? 0 : (subtotal > 5000 ? 0 : 250);
  const total = subtotal + shipping;

  // Helper function to parse saved address
  const parseSavedAddress = (fullAddr: string) => {
    let remaining = fullAddr;
    let label = '';
    
    // Check if address has a label
    if (remaining.startsWith('[')) {
      const endLabel = remaining.indexOf(']');
      label = remaining.substring(1, endLabel);
      remaining = remaining.substring(endLabel + 2);
    }
    
    // Parse: "Name LastName | email | phone | street, city, state, zip, country"
    const parts = remaining.split(' | ');
    const names = parts[0]?.split(' ') || ['', ''];
    const addressParts = parts[3]?.split(', ') || ['', '', '', ''];
    
    return {
      label,
      name: names[0] || '',
      lastName: names.slice(1).join(' ') || '',
      email: parts[1] || '',
      phone: parts[2] || '',
      street: addressParts[0] || '',
      city: addressParts[1] || 'Monterrey',
      state: addressParts[2] || 'Nuevo León',
      zip: addressParts[3]?.replace('CP ', '').trim() || '',
      country: addressParts[4] || 'México'
    };
  };

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

  const validateStep1 = (): boolean => {
    const errors: string[] = [];
    
    if (!formData.name.trim()) errors.push('nombre');
    if (!formData.lastName.trim()) errors.push('apellido');
    if (!formData.email.trim()) errors.push('email');
    if (!formData.phone.trim()) errors.push('teléfono');
    
    if (formData.deliveryMethod === 'shipping') {
      if (!formData.address.trim()) errors.push('dirección');
      if (!formData.city.trim()) errors.push('ciudad');
      if (!formData.state.trim()) errors.push('estado');
      if (!formData.zip.trim()) errors.push('código postal');
    }
    
    if (errors.length > 0) {
      setErrorFields(errors);
      setErrorMessage(`Por favor completa los siguientes campos: ${errors.join(', ')}`);
      return false;
    }
    
    setErrorFields([]);
    setErrorMessage('');
    return true;
  };

  const handlePayWithMercadoPago = async () => {
    if (!validateStep1()) {
      return;
    }

    setLoading(true);
    try {
      // Generate order ID (will be created by webhook after payment is approved)
      const orderId = generateOrderId();
      
      const orderData = {
        id: orderId,
        userId: user?.id || 'guest',
        userName: `${formData.name} ${formData.lastName}`,
        userEmail: formData.email,
        userPhone: formData.phone,
        items: cart,
        total: total,
        deliveryMethod: formData.deliveryMethod,
        shippingAddress: formData.deliveryMethod === 'pickup' 
          ? `Recoger en tienda: ${formData.pickupLocation}`
          : `${formData.address}, ${formData.city}, ${formData.state}, CP ${formData.zip}`
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
      {/* Error Modal */}
      {errorMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl animate-fadeIn overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-5 flex items-center gap-3">
              <i className="fas fa-exclamation-circle text-white text-2xl"></i>
              <h3 className="text-white font-bold text-lg">Campos Requeridos</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-700 mb-4 text-sm leading-relaxed">
                Por favor completa los siguientes campos:
              </p>
              <div className="bg-red-50 rounded-2xl p-4 mb-6">
                <ul className="space-y-2">
                  {errorFields.map((field, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-slate-700 text-sm capitalize">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      <span>{field}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => {
                  setErrorMessage('');
                  setErrorFields([]);
                }}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all"
              >
                Entendido, llenar campos
              </button>
            </div>
          </div>
        </div>
      )}

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
                    <p className="text-xs text-slate-500">Selecciona tu sucursal</p>
                    <p className="text-xs font-bold text-green-600 mt-1">Gratis</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Pickup Location Selector (only shown if pickup is selected) */}
          {formData.deliveryMethod === 'pickup' && (
            <div className="mb-8">
              <label className="text-sm font-bold text-slate-700 mb-3 block">Sucursal para recolección</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, pickupLocation: 'AV DE LA JUVENTUD #590, San Nicolás de los Garza, NL' })}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    formData.pickupLocation === 'AV DE LA JUVENTUD #590, San Nicolás de los Garza, NL'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                      formData.pickupLocation === 'AV DE LA JUVENTUD #590, San Nicolás de los Garza, NL' ? 'border-blue-600' : 'border-slate-300'
                    }`}>
                      {formData.pickupLocation === 'AV DE LA JUVENTUD #590, San Nicolás de los Garza, NL' && (
                        <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                      )}
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-1">
                        <i className="fas fa-map-marker-alt text-blue-600"></i>
                        <span className="font-bold text-slate-800">Monterrey</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">AV DE LA JUVENTUD #590</p>
                      <p className="text-xs text-slate-600">San Nicolás de los Garza, NL</p>
                    </div>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, pickupLocation: 'Av. Itzáes 665 con, Sambulá, 97250 Mérida, Yuc.' })}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    formData.pickupLocation === 'Av. Itzáes 665 con, Sambulá, 97250 Mérida, Yuc.'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                      formData.pickupLocation === 'Av. Itzáes 665 con, Sambulá, 97250 Mérida, Yuc.' ? 'border-blue-600' : 'border-slate-300'
                    }`}>
                      {formData.pickupLocation === 'Av. Itzáes 665 con, Sambulá, 97250 Mérida, Yuc.' && (
                        <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                      )}
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-1">
                        <i className="fas fa-map-marker-alt text-blue-600"></i>
                        <span className="font-bold text-slate-800">Mérida</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">Av. Itzáes 665 con, Sambulá</p>
                      <p className="text-xs text-slate-600">97250 Mérida, Yuc.</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Nombre</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Apellido</label>
              <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Teléfono</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20" placeholder="8112345678" required />
            </div>
          </div>

          {/* Shipping Address (only shown if shipping is selected) */}
          {formData.deliveryMethod === 'shipping' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Saved Addresses for Logged-in Users */}
              {user && user.addresses && user.addresses.length > 0 && (
                <div className="md:col-span-2 space-y-2 mb-4">
                  <label className="text-sm font-bold text-slate-700">Mis direcciones guardadas</label>
                  <div className="grid grid-cols-1 gap-2">
                    {user.addresses.map((savedAddress, index) => {
                      const parsedAddr = parseSavedAddress(savedAddress);
                      const displayAddr = `${parsedAddr.name} ${parsedAddr.lastName} | ${parsedAddr.street}, ${parsedAddr.city}`;
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              name: parsedAddr.name,
                              lastName: parsedAddr.lastName,
                              email: parsedAddr.email,
                              phone: parsedAddr.phone,
                              address: parsedAddr.street,
                              city: parsedAddr.city,
                              state: parsedAddr.state,
                              zip: parsedAddr.zip
                            });
                          }}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            formData.name === parsedAddr.name && formData.email === parsedAddr.email
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-1 ${
                              formData.name === parsedAddr.name && formData.email === parsedAddr.email ? 'border-blue-600' : 'border-slate-300'
                            }`}>
                              {formData.name === parsedAddr.name && formData.email === parsedAddr.email && (
                                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                              )}
                            </div>
                            <div className="flex-grow">
                              {parsedAddr.label && (
                                <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">{parsedAddr.label}</p>
                              )}
                              <p className="text-sm font-bold text-slate-800 mb-1">{parsedAddr.name} {parsedAddr.lastName}</p>
                              <p className="text-xs text-slate-600">{parsedAddr.street}, {parsedAddr.city}</p>
                              <p className="text-xs text-slate-600">{parsedAddr.email} • {parsedAddr.phone}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <div className="flex-grow h-px bg-slate-200"></div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">O usa una nueva dirección</span>
                    <div className="flex-grow h-px bg-slate-200"></div>
                  </div>
                </div>
              )}
              
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-slate-700">Dirección de envío</label>
                <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20" placeholder="Calle y número" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Ciudad</label>
                <input type="text" name="city" value={formData.city} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Estado</label>
                <input type="text" name="state" value={formData.state} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20" placeholder="Nuevo León" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Código Postal</label>
                <input type="text" name="zip" value={formData.zip} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20" placeholder="66000" />
              </div>
            </div>
          )}
          
          <button 
            onClick={() => {
              if (validateStep1()) {
                setStep(2);
              }
            }} 
            className="w-full mt-8 bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
          >
            Siguiente: Pago
          </button>
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
