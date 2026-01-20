
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import Footer from '../components/Footer';
import { getSmartSearchSuggestions } from '../services/geminiService';

interface CatalogProps {
  products: Product[];
  onAddToCart: (p: Product) => void;
}

const CustomDropdown: React.FC<{
  label: string;
  options: string[];
  selected: string;
  onSelect: (val: string) => void;
  placeholder?: string;
}> = ({ label, options, selected, onSelect, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex-grow md:flex-grow-0 min-w-[240px] relative" ref={dropdownRef}>
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{label}</label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-white border-2 rounded-2xl px-5 py-3 text-sm font-bold text-slate-700 flex items-center justify-between transition-all shadow-sm ${isOpen ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-50 hover:border-slate-200'}`}
      >
        <span className="truncate">{selected === 'All' ? (placeholder || 'Todos') : selected}</span>
        <i className={`fas fa-chevron-down text-xs transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : 'text-slate-400'}`}></i>
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-slate-100 rounded-[1.5rem] shadow-2xl py-3 z-50 animate-scaleIn max-h-[300px] overflow-y-auto custom-scrollbar">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => {
                onSelect(option);
                setIsOpen(false);
              }}
              className={`w-full text-left px-5 py-3 text-sm font-bold transition-colors ${selected === option ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {option === 'All' ? (placeholder || 'Todos') : option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Catalog: React.FC<CatalogProps> = ({ products, onAddToCart }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const brands = useMemo(() => [
    'All', 'Nissan', 'Toyota', 'Ford', 'Volkswagen', 'Honda', 'Chevrolet', 
    'Mazda', 'BMW', 'Mercedes', 'Hyundai', 'Kia', 'Mitsubishi', 'Audi'
  ], []);
  
  const categories = ['All', 'Cremallera Hidráulica', 'Cremallera Electrónica', 'Bomba Hidráulica'];

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchTerm.length > 2) {
        setIsSearching(true);
        const res = await getSmartSearchSuggestions(searchTerm, products);
        setSuggestions(res);
        setIsSearching(false);
      } else {
        setSuggestions([]);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [searchTerm, products]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.compatibleModels.some(m => m.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesBrand = selectedBrand === 'All' || p.brand === selectedBrand;
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesBrand && matchesCategory;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Nuestro Catálogo</h1>
          
          <div className="relative flex-grow max-w-md">
            <input 
              type="text" 
              placeholder="Busca marca, modelo o pieza..." 
              className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm transition-all outline-none font-bold text-slate-800 placeholder-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
              <i className="fas fa-search"></i>
            </div>
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-2xl shadow-2xl z-30 py-3 animate-fadeIn">
                <p className="px-5 py-1 text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">Sugerencias inteligentes</p>
                {suggestions.map((s, idx) => (
                  <button key={idx} onClick={() => setSearchTerm(s)} className="w-full text-left px-5 py-3 hover:bg-blue-50 text-sm font-bold text-slate-700 transition-colors">{s}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Custom Dropdown Filters */}
        <div className="flex flex-wrap gap-6 mb-16 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 items-end">
          <CustomDropdown 
            label="Marca de Vehículo" 
            options={brands} 
            selected={selectedBrand} 
            onSelect={setSelectedBrand} 
            placeholder="Todas las Marcas"
          />
          <CustomDropdown 
            label="Tipo de Refacción" 
            options={categories} 
            selected={selectedCategory} 
            onSelect={setSelectedCategory} 
            placeholder="Todas las Categorías"
          />
          <button 
            onClick={() => {setSearchTerm(''); setSelectedBrand('All'); setSelectedCategory('All');}}
            className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 rounded-2xl transition-all shadow-lg h-[52px]"
          >
            <i className="fas fa-undo"></i> Reiniciar
          </button>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
            {filteredProducts.map(p => (
              <ProductCard key={p.id} product={p} onAddToCart={onAddToCart} />
            ))}
          </div>
        ) : (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-32 text-center shadow-sm">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-200"><i className="fas fa-search text-4xl"></i></div>
            <p className="text-slate-800 font-black text-2xl tracking-tighter">Sin resultados</p>
            <p className="text-slate-400 font-medium mt-3">Prueba con otros filtros o términos de búsqueda.</p>
            <button 
              onClick={() => {setSearchTerm(''); setSelectedBrand('All'); setSelectedCategory('All');}}
              className="mt-8 text-blue-600 font-black uppercase tracking-widest text-xs hover:underline"
            >
              Limpiar búsqueda
            </button>
          </div>
        )}
      </div>
      <Footer />
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

export default Catalog;
