import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import emailjs from '@emailjs/browser';

const EMAILJS_SERVICE_ID = (import.meta as any).env?.VITE_EMAILJS_SERVICE_ID || 'service_qx0z97v';
const EMAILJS_TEMPLATE_ID = (import.meta as any).env?.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = (import.meta as any).env?.VITE_EMAILJS_PUBLIC_KEY;

// Initialize EmailJS once
if (EMAILJS_PUBLIC_KEY) {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const emailSentRef = useRef(false);

  useEffect(() => {
    // Get order info from navigation state
    if (location.state?.order) {
      const order = location.state.order;
      // Map database field names to camelCase
      const mappedOrder = {
        id: order.id,
        userName: order.user_name || order.userName,
        userEmail: order.user_email || order.userEmail,
        items: order.items || [],
        total: order.total,
        status: order.status,
        shippingAddress: order.shipping_address || order.shippingAddress
      };
      setOrderInfo(mappedOrder);
      
      // Refetch products to update stock after successful payment
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      fetch(`${backendUrl}/api/products`)
        .then(res => res.json())
        .then(data => {
          // Window reload will trigger App.tsx useEffect to refetch products
          // Or store in sessionStorage and let App.tsx handle it
          sessionStorage.setItem('refreshProducts', 'true');
          console.log('Products refresh flag set');
        })
        .catch(err => console.error('Failed to refetch products:', err));
    }
  }, [location]);

  useEffect(() => {
    if (!orderInfo?.id || !orderInfo?.userEmail) {
      console.log('Missing order data:', { id: orderInfo?.id, email: orderInfo?.userEmail });
      return;
    }
    if (emailSentRef.current) {
      console.log('Email already sent for order:', orderInfo.id);
      return;
    }
    if (!EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
      console.warn('EmailJS not configured. Missing template id or public key.', {
        templateId: EMAILJS_TEMPLATE_ID,
        publicKey: EMAILJS_PUBLIC_KEY
      });
      return;
    }

    emailSentRef.current = true;

    const formatter = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    });

    const orderItems = Array.isArray(orderInfo.items)
      ? orderInfo.items
          .map((item: any) => `${item.name} x${item.quantity} - ${formatter.format(item.price * item.quantity)}`)
          .join('\n')
      : '';

    const emailToSend = orderInfo.userEmail;
    
    const templateParams = {
      to_email: emailToSend,
      customer_name: orderInfo.userName || 'Cliente',
      customer_email: emailToSend,
      order_id: orderInfo.id,
      order_total: formatter.format(orderInfo.total || 0),
      shipping_address: orderInfo.shippingAddress || 'Recoger en tienda',
      order_status: orderInfo.status || 'Pagado',
      order_items: orderItems || 'Sin items'
    };

    console.log('🚀 Sending email to:', emailToSend);
    console.log('📧 Email params:', templateParams);

    emailjs
      .send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
      .then((response) => {
        console.log('✅ Order email sent successfully to:', emailToSend, 'Response:', response.status, response.text);
      })
      .catch((error) => {
        console.error('❌ Failed to send order email to:', emailToSend, 'Error:', error);
      });
  }, [orderInfo]);

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
          <div className="mb-6">
            <p className="text-sm text-gray-500">
              Número de orden:
            </p>
            <p className="mt-1 text-base font-mono text-gray-900">{orderInfo.id}</p>
            <p className="mt-2 text-xs text-gray-500">
              Guárdalo para consultar el estado de tu pedido.
            </p>
          </div>
        )}
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            Recibirás un correo de confirmación con los detalles de tu pedido. Si necesitas ayuda, comparte tu número de orden al contactarnos.
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
