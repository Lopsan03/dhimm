
import React, { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Product } from '../types';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';

interface ProductDetailProps {
  products: Product[];
  onAddToCart: (p: Product) => void;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ products, onAddToCart }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const product = products.find(p => p.id === id);
  const carouselRef = useRef<HTMLDivElement>(null);
  
  const [reviews, setReviews] = useState([
    { name: 'Ricardo G.', stars: 5, comment: 'Excelente calidad, le quedó perfecto a mi Tsuru. El envío fue muy rápido.' },
    { name: 'Maria L.', stars: 4, comment: 'Muy buena atención técnica, me ayudaron a confirmar la compatibilidad.' }
  ]);
  const [newReview, setNewReview] = useState({ name: '', comment: '' });

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <div className="bg-white rounded-[3rem] p-16 border-2 border-slate-100 shadow-lg">
          <i className="fas fa-box-open text-6xl text-slate-300 mb-6"></i>
          <h2 className="text-3xl font-black text-slate-900 mb-4">Producto no encontrado</h2>
          <p className="text-slate-500 mb-8">El producto que buscas no está disponible en este momento.</p>
          <Link to="/catalog" className="inline-block bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all">
            Ver Catálogo
          </Link>
        </div>
      </div>
    );
  }

  const handleBuyNow = () => {
    onAddToCart(product);
    navigate('/cart');
  };

  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const { scrollLeft, clientWidth } = carouselRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      carouselRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (newReview.name && newReview.comment) {
      setReviews([{ name: newReview.name, stars: 5, comment: newReview.comment }, ...reviews]);
      setNewReview({ name: '', comment: '' });
    }
  };

  const relatedProducts = products.filter(p => p.id !== product.id).slice(0, 8);

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-8">
          <Link to="/" className="hover:text-blue-600">Inicio</Link>
          <i className="fas fa-chevron-right text-[10px]"></i>
          <Link to="/catalog" className="hover:text-blue-600">Catálogo</Link>
          <i className="fas fa-chevron-right text-[10px]"></i>
          <span className="text-slate-600 font-medium">{product.name}</span>
        </div>

        {/* Top Section: Image & Purchase Box */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          <div className="space-y-4">
            <div className="aspect-[4/3] rounded-3xl overflow-hidden border-2 border-slate-50 shadow-sm bg-white">
              <img src={product.image} alt={product.name} className="w-full h-full object-contain p-4" />
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-blue-600 font-black tracking-widest uppercase text-xs mb-2">{product.brand}</span>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 leading-tight">{product.name}</h1>
            
            <div className="flex items-center gap-2 mb-8 text-orange-400">
              <div className="flex text-sm">
                <i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i>
              </div>
              <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">(24 reseñas)</span>
            </div>

            <div className="bg-slate-50/50 rounded-[2.5rem] p-10 border-2 border-slate-50">
              <div className="flex items-end gap-3 mb-8">
                <span className="text-5xl font-black text-slate-900">${product.price.toLocaleString('es-MX')}</span>
                <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest mb-2">MXN / Neto</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 text-xs font-bold text-slate-600">
                  <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0"><i className="fas fa-truck"></i></div>
                  <span>Envío Gratis Nacional</span>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 text-xs font-bold text-slate-600">
                  <div className="w-8 h-8 bg-green-50 text-green-600 rounded-full flex items-center justify-center flex-shrink-0"><i className="fas fa-shield-alt"></i></div>
                  <span>12 Meses Garantía</span>
                </div>
              </div>

              <div className="flex flex-col gap-4 mt-auto">
                <button 
                  onClick={handleBuyNow}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2 tracking-widest"
                >
                  COMPRAR AHORA
                </button>
                <button 
                  onClick={() => onAddToCart(product)}
                  className="w-full bg-white border-2 border-slate-200 text-slate-800 font-black py-5 rounded-2xl hover:bg-slate-100 transition-all flex items-center justify-center gap-3 tracking-widest"
                >
                  <i className="fas fa-shopping-cart"></i> AÑADIR AL CARRITO
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mid Section: Description & Benefits */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 py-16 border-t border-slate-100">
          <div className="lg:col-span-2 space-y-12">
            <div>
              <h2 className="text-blue-600 font-black uppercase tracking-widest text-[10px] mb-2">Información Técnica</h2>
              <h3 className="text-3xl font-black text-slate-900 mb-6">Detalles del Producto</h3>
              <p className="text-slate-600 leading-relaxed text-lg">{product.description}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-50 p-8 rounded-3xl">
                <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                  <i className="fas fa-list-ul text-blue-600"></i> Ficha Técnica
                </h3>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li className="flex justify-between border-b border-slate-200/50 pb-2"><strong>Categoría:</strong> <span>{product.category}</span></li>
                  <li className="flex justify-between border-b border-slate-200/50 pb-2"><strong>Marca:</strong> <span>{product.brand}</span></li>
                  <li className="flex justify-between"><strong>Estado:</strong> <span>{product.estado || 'Premium'}</span></li>
                </ul>
              </div>
              <div className="bg-slate-50 p-8 rounded-3xl">
                <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                  <i className="fas fa-car-side text-blue-600"></i> Compatibilidad
                </h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  {product.compatibleModels.map((m, i) => (
                    <li key={i} className="flex items-start gap-2 font-medium">
                      <i className="fas fa-check mt-1 text-green-500"></i> {m}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest">¿Por qué elegir Dhimma?</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-white shadow-md rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0"><i className="fas fa-user-shield"></i></div>
                <div><h4 className="font-black text-slate-800 text-sm">Pago Blindado</h4><p className="text-xs text-slate-500 mt-1">Transacciones seguras y encriptadas.</p></div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-white shadow-md rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0"><i className="fas fa-exchange-alt"></i></div>
                <div><h4 className="font-black text-slate-800 text-sm">Garantía Real</h4><p className="text-xs text-slate-500 mt-1">Soporte directo ante cualquier falla.</p></div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-white shadow-md rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0"><i className="fas fa-truck-loading"></i></div>
                <div><h4 className="font-black text-slate-800 text-sm">Logística Express</h4><p className="text-xs text-slate-500 mt-1">Envío inmediato al confirmar tu compra.</p></div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="py-16 border-t border-slate-100">
          <h2 className="text-3xl font-black text-slate-900 mb-10">Experiencias de nuestros clientes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div className="space-y-6">
              {reviews.map((r, i) => (
                <div key={i} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-black text-slate-800">{r.name}</h4>
                    <div className="flex text-orange-400 text-[10px]">
                      {[...Array(r.stars)].map((_, j) => <i key={j} className="fas fa-star"></i>)}
                    </div>
                  </div>
                  <p className="text-slate-600 text-sm italic leading-relaxed">"{r.comment}"</p>
                </div>
              ))}
            </div>
            <div className="bg-slate-50 p-10 rounded-[2.5rem] border-2 border-white shadow-xl shadow-slate-200/50">
              <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs mb-6">Cuéntanos tu experiencia</h3>
              <form onSubmit={handleAddReview} className="space-y-5">
                <input 
                  type="text" placeholder="Nombre completo" 
                  className="w-full p-4 bg-white rounded-2xl outline-none font-medium border border-transparent focus:border-blue-500 transition-all" 
                  value={newReview.name} onChange={e => setNewReview({...newReview, name: e.target.value})}
                />
                <textarea 
                  placeholder="Escribe tu opinión aquí..." 
                  rows={4} className="w-full p-4 bg-white rounded-2xl outline-none font-medium border border-transparent focus:border-blue-500 transition-all"
                  value={newReview.comment} onChange={e => setNewReview({...newReview, comment: e.target.value})}
                ></textarea>
                <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all">Publicar reseña</button>
              </form>
            </div>
          </div>
        </div>

        {/* Related Carousel with Floating Buttons */}
        <div className="py-16 border-t border-slate-100 relative group">
          <h2 className="text-3xl font-black text-slate-900 mb-10">También te puede interesar</h2>
          
          <button 
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-14 h-14 bg-white border border-slate-100 rounded-full shadow-2xl flex items-center justify-center text-slate-800 hover:text-blue-600 z-10 opacity-0 group-hover:opacity-100 transition-all"
          >
            <i className="fas fa-chevron-left"></i>
          </button>
          
          <div 
            ref={carouselRef}
            className="flex gap-8 overflow-x-auto pb-8 snap-x scrollbar-hide no-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {relatedProducts.map(p => (
              <div key={p.id} className="min-w-[300px] snap-start">
                <ProductCard product={p} onAddToCart={onAddToCart} />
              </div>
            ))}
          </div>

          <button 
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-14 h-14 bg-white border border-slate-100 rounded-full shadow-2xl flex items-center justify-center text-slate-800 hover:text-blue-600 z-10 opacity-0 group-hover:opacity-100 transition-all"
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
      <Footer />
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default ProductDetail;
