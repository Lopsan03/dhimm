import { loadMercadoPago } from '@mercadopago/sdk-js';

const PUBLIC_KEY = (import.meta as any).env?.VITE_MP_PUBLIC_KEY;
const ACCESS_TOKEN = (import.meta as any).env?.VITE_MP_ACCESS_TOKEN;
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
    // Build items array with shipping cost
    const preferenceItems = items.map(item => ({
      title: item.name,
      unit_price: Number(item.price),
      quantity: item.quantity,
      currency_id: 'MXN'
    }));

    // Add shipping cost as a separate item if applicable
    if (shipment?.cost && shipment.cost > 0) {
      preferenceItems.push({
        title: 'Envío',
        unit_price: Number(shipment.cost),
        quantity: 1,
        currency_id: 'MXN'
      });
    }

    const preference = {
      items: preferenceItems,
      payer: {
        email: payer.email
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
      payment_methods: {
        excluded_payment_types: [
          { id: 'ticket' },
          { id: 'atm' },
          { id: 'bank_transfer' },
          { id: 'account_money' }
        ],
        excluded_payment_methods: []
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
