import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const [orderInfo, setOrderInfo] = useState<any>(null);

  useEffect(() => {
    // Get order info from navigation state
    if (location.state?.order) {
      setOrderInfo(location.state.order);
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <svg className="w-16 h-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          ¡Pago Exitoso!
        </h1>
        
        <p className="text-gray-600 mb-2">
          Tu pedido ha sido confirmado.
        </p>
        
        {orderInfo?.id && (
          <p className="text-sm text-gray-500 mb-6">
            Número de orden: <span className="font-mono">{orderInfo.id.slice(0, 8)}</span>
          </p>
        )}
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            Recibirás un correo de confirmación con los detalles de tu pedido.
          </p>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Ver Mi Pedido
          </button>
          
          <button
            onClick={() => navigate('/catalog')}
            className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Seguir Comprando
          </button>
        </div>
      </div>
    </div>
  );
}
