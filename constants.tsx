
import { Product, Order } from './types';

export const COMPANY_INFO = {
  name: "Dhimma Automotriz",
  description: "Somos una empresa especializada en la venta de cajas de dirección electrónicas y bombas electrónicas. Manejamos todas las marcas y modelos.",
  category: "Automotive Wholesaler",
  address: "AV DE LA JUVENTUD #590, San Nicolás de los Garza, Mexico",
  phone: "81 3273 2525",
  email: "ventas_duar@hotmail.com",
  whatsapp: "https://wa.me/528132732525"
};

export const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Caja de Dirección Electrónica Nissan Tsuru III',
    category: 'Caja de Dirección Electrónica',
    brand: 'Nissan',
    compatibleModels: ['Tsuru III 1992-2017'],
    price: 3450,
    stock: 12,
    image: 'https://picsum.photos/seed/nissan1/400/300',
    description: 'Caja de dirección electrónica reconstruida con componentes originales para máxima durabilidad.'
  },
  {
    id: '2',
    name: 'Bomba Electrónica Toyota Hilux',
    category: 'Bomba Electrónica',
    brand: 'Toyota',
    compatibleModels: ['Hilux 2005-2015'],
    price: 2100,
    stock: 8,
    image: 'https://picsum.photos/seed/toyota1/400/300',
    description: 'Bomba de dirección asistida de alta presión, garantizando un manejo suave y preciso.'
  },
  {
    id: '3',
    name: 'Caja de Dirección Electrónica Ford Fusion',
    category: 'Caja de Dirección Electrónica',
    brand: 'Ford',
    compatibleModels: ['Fusion 2013-2018'],
    price: 8900,
    stock: 5,
    image: 'https://picsum.photos/seed/ford1/400/300',
    description: 'Módulo de dirección electrónica completo, calibrado y listo para instalar.'
  },
  {
    id: '4',
    name: 'Caja de Dirección Electrónica VW Jetta A4',
    category: 'Caja de Dirección Electrónica',
    brand: 'Volkswagen',
    compatibleModels: ['Jetta A4', 'Golf A4', 'Beetle'],
    price: 3150,
    stock: 20,
    image: 'https://picsum.photos/seed/vw1/400/300',
    description: 'Compatible con plataforma A4 de Volkswagen. Calidad premium.'
  },
  {
    id: '5',
    name: 'Bomba Electrónica Honda CR-V',
    category: 'Bomba Electrónica',
    brand: 'Honda',
    compatibleModels: ['CR-V 2007-2011'],
    price: 2400,
    stock: 15,
    image: 'https://picsum.photos/seed/honda1/400/300',
    description: 'Bomba electrónica original remanufacturada con sellos nuevos de alta resistencia.'
  },
  {
    id: '6',
    name: 'Caja de Dirección Electrónica Chevrolet Aveo',
    category: 'Caja de Dirección Electrónica',
    brand: 'Chevrolet',
    compatibleModels: ['Aveo 2008-2017'],
    price: 2850,
    stock: 10,
    image: 'https://picsum.photos/seed/chev1/400/300',
    description: 'Dirección electrónica reforzada para Aveo. Incluye terminales.'
  }
];

export const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-001',
    userId: 'u1',
    userName: 'Juan Pérez',
    userEmail: 'juan@example.com',
    items: [{ ...MOCK_PRODUCTS[0], quantity: 1 }],
    total: 3450,
    status: 'Completado',
    date: '2023-10-15',
    shippingAddress: 'Calle Falsa 123, Monterrey'
  },
  {
    id: 'ORD-002',
    userId: 'u1',
    userName: 'Juan Pérez',
    userEmail: 'juan@example.com',
    items: [{ ...MOCK_PRODUCTS[1], quantity: 2 }],
    total: 4200,
    status: 'Pendiente',
    date: '2023-11-20',
    shippingAddress: 'Calle Falsa 123, Monterrey'
  }
];
