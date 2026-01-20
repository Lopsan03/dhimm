
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartItem, User, Order } from '../types';

interface CheckoutProps {
  cart: CartItem[];
  user: User | null;
  onComplete: (o: Order) => void;
  clearCart: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ cart, user, onComplete, clearCart }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    address: user?.addresses[0] || '',
    city: 'Monterrey',
    zip: '',
    cardNum: '',
    expiry: '',
    cvv: '',
    coupon: ''
  });

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 5000 ? 0 : 250;
  const total = subtotal + shipping;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFinish = () => {
    const newOrder: Order = {
      id: `ORD-${Math.floor(Math.random() * 900000) + 100000}`,
      userId: user?.id || 'guest',
      userName: formData.name,
      userEmail: formData.email,
      items: [...cart],
      total: total,
      status: 'Pendiente',
      date: new Date().toISOString().split('T')[0],
      shippingAddress: `${formData.address}, ${formData.city}, CP ${formData.zip}`
    };
    onComplete(newOrder);
    clearCart();
    setStep(3);
  };

  if (cart.length === 0 && step !== 3) {
    navigate('/cart');
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
          <h2 className="text-2xl font-bold mb-6">Datos de Envío</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Nombre completo</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-bold text-slate-700">Dirección</label>
              <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Ciudad</label>
              <input type="text" name="city" value={formData.city} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Código Postal</label>
              <input type="text" name="zip" value={formData.zip} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </div>
          <button onClick={() => setStep(2)} className="w-full mt-8 bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20">Siguiente: Pago</button>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm animate-fadeIn">
          <h2 className="text-2xl font-bold mb-6">Información de Pago</h2>
          <div className="space-y-6">
            <div className="flex gap-4 p-4 border-2 border-blue-600 bg-blue-50 rounded-2xl">
              <div className="w-6 h-6 rounded-full border-4 border-blue-600"></div>
              <div>
                <p className="font-bold text-slate-800">Tarjeta de Crédito / Débito</p>
                <div className="flex gap-2 mt-1">
                  <i className="fab fa-cc-visa text-2xl text-slate-400"></i>
                  <i className="fab fa-cc-mastercard text-2xl text-slate-400"></i>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Número de Tarjeta</label>
              <input type="text" name="cardNum" placeholder="0000 0000 0000 0000" onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Expiración (MM/YY)</label>
                <input type="text" name="expiry" placeholder="MM/YY" onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">CVV</label>
                <input type="password" name="cvv" placeholder="123" onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
            </div>
            <div className="space-y-2 border-t border-slate-100 pt-6">
              <label className="text-sm font-bold text-slate-700">Cupón de descuento</label>
              <div className="flex gap-2">
                <input type="text" name="coupon" placeholder="CUPON10" onChange={handleInputChange} className="flex-grow p-3 bg-slate-50 border border-slate-200 rounded-xl" />
                <button className="bg-slate-200 px-6 rounded-xl text-xs font-bold uppercase">Aplicar</button>
              </div>
            </div>
          </div>
          <div className="mt-8 flex gap-4">
            <button onClick={() => setStep(1)} className="flex-grow bg-slate-100 py-4 rounded-2xl font-bold">Atrás</button>
            <button onClick={handleFinish} className="flex-grow bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20">Finalizar Compra</button>
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
