import { useNavigate } from 'react-router-dom';

export default function CheckoutFailure() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <svg className="w-16 h-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Pago Rechazado
        </h1>
        
        <p className="text-gray-600 mb-6">
          Hubo un problema con tu método de pago. Por favor, verifica tus datos e intenta nuevamente.
        </p>
        
        <div className="space-y-3">
          <button
            onClick={() => navigate('/checkout')}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Intentar Nuevamente
          </button>
          
          <button
            onClick={() => navigate('/catalog')}
            className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Volver al Catálogo
          </button>
        </div>
      </div>
    </div>
  );
}
