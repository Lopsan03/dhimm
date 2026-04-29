
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onAddToCart: (p: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleAdd = () => {
    setIsAnimating(true);
    onAddToCart(product);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-slate-100 overflow-hidden group">
      <Link to={`/product/${product.id}`} className="block relative aspect-[4/3] overflow-hidden bg-white">
        <img 
          src={product.image} 
          alt={product.name} 
          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105 p-3"
        />
        {product.stock <= 0 && (
          <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">Agotado</span>
          </div>
        )}
      </Link>
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase font-bold tracking-widest text-blue-600">{product.brand}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${product.stock > 5 ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
            {product.stock} en stock
          </span>
        </div>
        
        <Link to={`/product/${product.id}`}>
          <h3 className="text-slate-800 font-semibold text-base mb-1 hover:text-blue-600 transition-colors line-clamp-2 min-h-[3rem]">
            {product.name}
          </h3>
        </Link>
        
        <p className="text-slate-500 text-xs mb-4 line-clamp-1 italic">
          Compatibilidad: {product.compatibleModels.slice(0, 2).join(', ')}{product.compatibleModels.length > 2 ? '...' : ''}
        </p>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex flex-col gap-1">
            {product.discount_enabled && product.discounted_price ? (
              <>
                <span className="text-xs font-bold text-slate-400 line-through">
                  ${product.price.toLocaleString('es-MX')}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-green-600">
                    ${product.discounted_price.toLocaleString('es-MX')}
                  </span>
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 uppercase tracking-widest">
                    {Math.round((1 - product.discounted_price / product.price) * 100)}% OFF
                  </span>
                </div>
              </>
            ) : (
              <span className="text-lg font-bold text-slate-900">
                ${product.price.toLocaleString('es-MX')}
              </span>
            )}
          </div>
          <button 
            onClick={handleAdd}
            disabled={product.stock <= 0}
            className={`bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white p-2 rounded-lg transition-all flex items-center justify-center w-10 h-10 shadow-sm ${isAnimating ? 'scale-125' : 'scale-100'}`}
            title="Añadir al carrito"
          >
            <i className={`fas ${isAnimating ? 'fa-check' : 'fa-shopping-cart'}`}></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
