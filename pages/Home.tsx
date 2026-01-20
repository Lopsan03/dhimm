
import React from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import Footer from '../components/Footer';
import { COMPANY_INFO } from '../constants';

interface HomeProps {
  products: Product[];
  onAddToCart: (p: Product) => void;
}

const Home: React.FC<HomeProps> = ({ products, onAddToCart }) => {
  const featured = products.slice(0, 4);

  return (
    <div className="animate-fadeIn">
      {/* Hero Section */}
      <section className="relative h-[550px] flex items-center bg-slate-900 overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=2000&auto=format&fit=crop" 
          className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale-[50%]" 
          alt="Dhimma Banner"
        />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-4 uppercase tracking-tighter">
              Expertos en <span className="text-blue-500">Dirección Hidráulica</span>
            </h1>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed">
              Venta de cremalleras y bombas hidráulicas para todas las marcas. Calidad garantizada en cada pieza.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link 
                to="/catalog" 
                className="bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-10 rounded-full transition-all shadow-lg hover:shadow-blue-500/50 uppercase tracking-widest text-sm"
              >
                Ver Catálogo
              </Link>
              <a 
                href={COMPANY_INFO.whatsapp} 
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-slate-900 hover:bg-slate-100 font-black py-4 px-10 rounded-full transition-all shadow-lg uppercase tracking-widest text-sm"
              >
                Contáctanos
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 1. Benefits Section (Now first below hero) */}
      <section className="bg-white py-16 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex flex-col items-center text-center p-6 group">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-sm">
                <i className="fas fa-award text-2xl"></i>
              </div>
              <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs mb-1">Garantía de Calidad</h3>
              <p className="text-slate-500 text-sm">Productos garantizados</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 group">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-sm">
                <i className="fas fa-shipping-fast text-2xl"></i>
              </div>
              <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs mb-1">Envío Nacional</h3>
              <p className="text-slate-500 text-sm">A todo México</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 group">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-sm">
                <i className="fas fa-bolt text-2xl"></i>
              </div>
              <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs mb-1">Atención Rápida</h3>
              <p className="text-slate-500 text-sm">Respuesta inmediata</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 group">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-sm">
                <i className="fas fa-tags text-2xl"></i>
              </div>
              <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs mb-1">Todas las Marcas</h3>
              <p className="text-slate-500 text-sm">Amplio catálogo</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Featured Products (Now second) */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Productos Destacados</h2>
            <p className="text-slate-500 font-medium">Nuestras piezas más solicitadas para tu vehículo</p>
          </div>
          <Link to="/catalog" className="text-blue-600 font-black uppercase tracking-widest text-xs hover:underline flex items-center gap-1 group">
            Ver todo <i className="fas fa-arrow-right text-xs group-hover:translate-x-1 transition-transform"></i>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {featured.map(product => (
            <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
          ))}
        </div>
      </section>

      {/* 3. About Us Section (Now third) */}
      <section className="py-24 bg-slate-50 border-t border-slate-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="absolute -top-6 -left-6 w-32 h-32 bg-blue-600 rounded-[2.5rem] -z-10 opacity-5"></div>
              <img 
                src="https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?q=80&w=1000&auto=format&fit=crop" 
                alt="Taller Dhimma" 
                className="rounded-[3rem] shadow-2xl object-cover aspect-video lg:aspect-square border-8 border-white"
              />
              <div className="absolute -bottom-8 -right-8 bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl hidden md:block border-4 border-white">
                <p className="text-4xl font-black italic tracking-tighter">+15 AÑOS</p>
                <p className="text-[10px] uppercase font-black tracking-[0.2em] text-blue-500">De Experiencia</p>
              </div>
            </div>
            <div>
              <div className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
                Liderazgo Automotriz
              </div>
              <h3 className="text-4xl md:text-5xl font-black text-slate-900 mb-8 leading-tight tracking-tighter">Expertos en soluciones de dirección automotriz</h3>
              <p className="text-slate-600 text-lg mb-8 leading-relaxed font-medium">
                En <strong>Dhimma Automotriz</strong>, nos dedicamos apasionadamente a mantener la precisión y suavidad en el manejo de tu vehículo. Somos especialistas certificados en la reconstrucción y venta de sistemas de dirección hidráulica y electrónica de última generación.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-white shadow-sm text-blue-600 rounded-xl flex items-center justify-center text-xs flex-shrink-0"><i className="fas fa-microchip"></i></div>
                   <p className="text-sm font-bold text-slate-700">Tecnología Electrónica</p>
                </div>
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-white shadow-sm text-blue-600 rounded-xl flex items-center justify-center text-xs flex-shrink-0"><i className="fas fa-oil-can"></i></div>
                   <p className="text-sm font-bold text-slate-700">Sistemas Hidráulicos</p>
                </div>
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-white shadow-sm text-blue-600 rounded-xl flex items-center justify-center text-xs flex-shrink-0"><i className="fas fa-tools"></i></div>
                   <p className="text-sm font-bold text-slate-700">Reconstrucción Certificada</p>
                </div>
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-white shadow-sm text-blue-600 rounded-xl flex items-center justify-center text-xs flex-shrink-0"><i className="fas fa-truck-loading"></i></div>
                   <p className="text-sm font-bold text-slate-700">Distribución a Talleres</p>
                </div>
              </div>
              <Link to="/catalog" className="inline-flex items-center gap-3 bg-slate-900 text-white font-black uppercase tracking-widest text-xs px-8 py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10">
                Explorar Catálogo <i className="fas fa-arrow-right"></i>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
