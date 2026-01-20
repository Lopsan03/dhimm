
import React from 'react';
import { Link } from 'react-router-dom';
import { CartItem } from '../types';

interface CartProps {
  cart: CartItem[];
  updateQuantity: (id: string, delta: number) => void;
  remove: (id: string) => void;
}

const Cart: React.FC<CartProps> = ({ cart, updateQuantity, remove }) => {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 5000 ? 0 : 250;
  const total = subtotal + shipping;

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center animate-fadeIn">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <i className="fas fa-shopping-cart text-slate-300 text-4xl"></i>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Tu carrito está vacío</h2>
        <p className="text-slate-500 mb-8">Parece que aún no has agregado ninguna pieza a tu selección.</p>
        <Link to="/catalog" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full transition-all inline-block">
          Explorar Catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fadeIn">
      <h1 className="text-3xl font-bold text-slate-800 mb-8">Carrito de Compras</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Item List */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map(item => (
            <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex gap-4 shadow-sm">
              <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden border border-slate-100">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-grow flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="text-slate-800 font-bold text-lg line-clamp-1">{item.name}</h3>
                    <button onClick={() => remove(item.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                  <p className="text-slate-500 text-xs">{item.brand}</p>
                </div>
                
                <div className="flex justify-between items-end">
                  <div className="flex items-center border border-slate-200 rounded-lg">
                    <button onClick={() => updateQuantity(item.id, -1)} className="px-3 py-1 text-slate-500 hover:text-blue-600 transition-colors">-</button>
                    <span className="px-3 py-1 font-bold text-sm min-w-[2.5rem] text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="px-3 py-1 text-slate-500 hover:text-blue-600 transition-colors">+</button>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-[10px] line-through">${(item.price * 1.1).toLocaleString('es-MX')}</p>
                    <p className="text-slate-900 font-bold">${(item.price * item.quantity).toLocaleString('es-MX')}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl sticky top-24">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Resumen del pedido</h2>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString('es-MX')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Envío</span>
                <span className={shipping === 0 ? 'text-green-600 font-bold' : ''}>
                  {shipping === 0 ? 'Gratis' : `$${shipping.toLocaleString('es-MX')}`}
                </span>
              </div>
              {shipping > 0 && (
                <p className="text-[10px] text-slate-400 italic">Envío gratis en compras mayores a $5,000 MXN</p>
              )}
            </div>
            
            <div className="pt-6 border-t border-slate-100 flex justify-between items-end mb-8">
              <span className="text-slate-800 font-bold">Total</span>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">IVA incluido</span>
                <span className="text-3xl font-black text-blue-600">${total.toLocaleString('es-MX')}</span>
              </div>
            </div>

            <Link to="/checkout" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20">
              Continuar al pago <i className="fas fa-arrow-right text-xs"></i>
            </Link>
            
            <p className="text-center text-[10px] text-slate-400 mt-4 px-6">
              Al hacer clic, aceptas nuestros términos y condiciones de compra.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
