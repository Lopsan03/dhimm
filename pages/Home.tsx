
import React from 'react';
import specialistImg from '../images/specialist.JPG';
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
      <section className="relative bg-slate-50 py-20 border-y border-slate-100">
        <div className="absolute inset-x-0 -top-6 h-6 bg-gradient-to-b from-white/0 via-white/70 to-slate-50 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-blue-600">Por qué elegirnos</p>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Beneficios que te respaldan</h2>
            </div>
            <div className="hidden md:flex items-center gap-3 text-sm text-slate-500">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span>Servicio confiable en todo México</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: 'fa-award', title: 'Garantía de Calidad', text: 'Productos garantizados' },
              { icon: 'fa-shipping-fast', title: 'Envío Nacional', text: 'A todo México' },
              { icon: 'fa-bolt', title: 'Atención Rápida', text: 'Respuesta inmediata' },
              { icon: 'fa-tags', title: 'Todas las Marcas', text: 'Amplio catálogo' }
            ].map((item) => (
              <div
                key={item.title}
                className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm p-7 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-blue-200"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-blue-50 via-white to-slate-50"></div>
                <div className="relative flex flex-col gap-4">
                  <div className="w-14 h-14 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner group-hover:shadow-md transition-all duration-300 group-hover:bg-blue-100">
                    <i className={`fas ${item.icon} text-xl`}></i>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-black text-slate-900 text-lg tracking-tight">{item.title}</h3>
                    <p className="text-slate-500 text-sm">{item.text}</p>
                  </div>
                </div>
              </div>
            ))}
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
                src={specialistImg} 
                alt="Expertos en soluciones de dirección automotriz" 
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
