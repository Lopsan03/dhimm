import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3001';

// Simple logger for frontend
const logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data)
};

const CheckoutWaiting: React.FC = () => {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const [status, setStatus] = useState<string>('pending');
  const [attempts, setAttempts] = useState(0);
  const [notFoundCount, setNotFoundCount] = useState(0);
  const maxAttempts = 60; // ~5 minutes (60 * 5s)

  useEffect(() => {
    if (!orderId) {
      navigate('/');
      return;
    }

    const pollOrderStatus = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/orders/${orderId}`);
        if (!response.ok) {
          if (response.status === 404) {
            // Track consecutive 404s - if payment rejected, order won't be created
            setNotFoundCount(prev => {
              const newCount = prev + 1;
              if (newCount >= 6) {
                // After 6 consecutive 404s (~30 seconds), assume payment failed
                sessionStorage.removeItem('pendingOrderId');
                sessionStorage.removeItem('orderData');
                setStatus('rejected');
                setTimeout(() => navigate('/checkout/failure'), 1500);
              }
              return newCount;
            });
            return;
          }
          console.error('Error fetching order status');
          return;
        }
        const order = await response.json();
        const normalized = (order.status || '').toString().toLowerCase();
        setStatus(normalized);
        setNotFoundCount(0); // Reset 404 counter on successful fetch

        // Redirect when payment is confirmed (supports all statuses)
        if (order && order.id) {
          const normalizedStatus = (order.status || '').toString().toLowerCase();
          
          // Success: Payment approved/confirmed or order shipped
          if (['pagado', 'approved', 'completado', 'completed', 'enviado', 'shipped'].includes(normalizedStatus)) {
            sessionStorage.removeItem('pendingOrderId');
            sessionStorage.removeItem('orderData');
            sessionStorage.removeItem('webhookUrl');
            setTimeout(() => navigate('/checkout/success', { state: { order } }), 2000);
            return;
          }
          
          // Still pending (e.g., SPEI/OXXO awaiting confirmation)
          if (['pendiente', 'pending', 'in_process', 'in_mediation'].includes(normalizedStatus)) {
            logger.info('Order pending confirmation', { orderId, status: order.status });
            setStatus(normalizedStatus);
            return;
          }
          
          // Failure: Payment rejected/cancelled/disputed
          if (['rejected', 'cancelled', 'refunded', 'chargedback', 'indispute'].includes(normalizedStatus)) {
            logger.error('Payment failed', { orderId, status: order.status });
            sessionStorage.removeItem('pendingOrderId');
            sessionStorage.removeItem('orderData');
            setStatus('rejected');
            setTimeout(() => navigate('/checkout/failure'), 1500);
            return;
          }
        }
      } catch (error) {
        console.error('Error polling order:', error);
      }
    };

    pollOrderStatus();
    const interval = setInterval(() => {
      setAttempts(prev => {
        const next = prev + 1;
        if (next >= maxAttempts) clearInterval(interval);
        return next;
      });
      pollOrderStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [orderId, navigate]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center bg-white rounded-3xl p-12 border border-slate-200 shadow-xl">
        <div className="w-16 h-16 mx-auto mb-6">
          {status === 'approved' ? (
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <i className="fas fa-check text-3xl"></i>
            </div>
          ) : status === 'rejected' ? (
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <i className="fas fa-times text-3xl"></i>
            </div>
          ) : (
            <i className="fas fa-spinner fa-spin text-4xl text-blue-600"></i>
          )}
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          {status === 'approved' ? '¡Pago Confirmado!' :
           status === 'rejected' ? 'Pago Rechazado' : 'Esperando confirmación de pago...'}
        </h2>
        <p className="text-slate-500 mb-4">
          {status === 'approved'
            ? 'Tu pedido ha sido procesado exitosamente'
            : status === 'rejected'
              ? 'El pago fue rechazado. Intenta nuevamente.'
              : 'Estamos verificando tu pago con Mercado Pago'}
        </p>
        {['pending', 'pendiente', 'in_process', 'in_mediation'].includes(status) && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-slate-600">
              <i className="fas fa-info-circle text-blue-600 mr-2"></i>
              {attempts >= 5
                ? 'El pago sigue pendiente. Si ves el cargo en tu cuenta, contáctanos para verificar tu pedido.'
                : 'Este proceso puede tardar hasta 2 minutos. Por favor no cierres esta ventana.'}
            </div>
            <p className="text-xs text-slate-400">Intento {attempts} de {maxAttempts}</p>
          </>
        )}
        {status === 'approved' && (
          <p className="text-sm text-slate-400 mt-4">Redirigiendo a tu dashboard...</p>
        )}
        {attempts >= maxAttempts && ['pending', 'pendiente', 'in_process', 'in_mediation'].includes(status) && (
          <div className="mt-6">
            <p className="text-slate-600 mb-4">
              No pudimos confirmar tu pago automáticamente. Revisa tu email o dashboard en unos minutos.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-700 transition-all"
            >
              Ir a Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutWaiting;
