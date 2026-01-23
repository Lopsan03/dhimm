import { loadMercadoPago } from '@mercadopago/sdk-js';

// Prefer env, fall back to provided test credentials
const PUBLIC_KEY = (import.meta as any).env?.VITE_MP_PUBLIC_KEY || 'TEST-a8cb9950-5db7-490d-ba81-031394f1c299';
const ACCESS_TOKEN = (import.meta as any).env?.VITE_MP_ACCESS_TOKEN || 'TEST-4373910761408557-012309-3558695af674ac083263ab322f010d4f-3131107438';
const DEFAULT_WEBHOOK_URL = (import.meta as any).env?.VITE_MP_WEBHOOK_URL;

let mercadoPagoInstance: any = null;

export const initMercadoPago = async () => {
  if (!mercadoPagoInstance) {
    await loadMercadoPago();
    const mp = new (window as any).MercadoPago(PUBLIC_KEY);
    mercadoPagoInstance = mp;
  }
  return mercadoPagoInstance;
};

export const createPreference = async (
  items: any[],
  payer: any,
  shipment: any,
  orderId: string,
  webhookUrl?: string
) => {
  try {
    const preference = {
      items: items.map(item => ({
        title: item.name,
        unit_price: Number(item.price),
        quantity: item.quantity,
        currency_id: 'MXN'
      })),
      payer: {
        name: payer.name || 'Cliente',
        email: payer.email,
        phone: {
          area_code: '52',
          number: '0000000000'
        },
        identification: {
          type: 'DNI',
          number: '00000000'
        },
        address: {
          street_name: 'Calle',
          street_number: 0,
          zip_code: '00000'
        }
      },
      shipments: {
        receiver_address: {
          street_name: shipment.address || 'Calle',
          street_number: 0,
          zip_code: shipment.zip || '00000',
          city_name: shipment.city || 'México',
          state_name: 'México',
          country_name: 'México'
        }
      },
      external_reference: orderId,
      back_urls: {
        success: `${window.location.origin}/#/checkout/waiting/${orderId}`,
        failure: `${window.location.origin}/#/checkout`,
        pending: `${window.location.origin}/#/checkout/waiting/${orderId}`
      },
      ...(webhookUrl || DEFAULT_WEBHOOK_URL ? { notification_url: webhookUrl || DEFAULT_WEBHOOK_URL } : {})
    };

    console.log('Creating preference:', preference);

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      },
      body: JSON.stringify(preference)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Mercado Pago API Error:', errorData);
      throw new Error(`Error creating preference: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('Preference created:', data);
    sessionStorage.setItem('lastPreferenceId', data.id);
    return data;
  } catch (error) {
    console.error('Error creating Mercado Pago preference:', error);
    throw error;
  }
};

export const openCheckout = (preferenceId: string, onClose?: () => void) => {
  try {
    const checkoutUrl = `https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=${preferenceId}`;
    const popupWindow = window.open(
      checkoutUrl,
      'mercadopago_checkout',
      'width=800,height=900,left=200,top=100,resizable=yes,scrollbars=yes'
    );

    if (!popupWindow) {
      console.error('Popup was blocked');
      throw new Error('Por favor permite popups para continuar');
    }

    const popupMonitor = setInterval(() => {
      if (popupWindow.closed) {
        clearInterval(popupMonitor);
        console.log('Mercado Pago popup closed');
        if (onClose) onClose();
      }
    }, 500);

    console.log('Mercado Pago popup opened');
    return popupWindow;
  } catch (error) {
    console.error('Error opening checkout:', error);
    throw error;
  }
};
