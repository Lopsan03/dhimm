import React, { useState, useEffect, useRef } from 'react';

interface CustomDropdownProps {
  label: string;
  options: string[];
  selected: string;
  onSelect: (val: string) => void;
  placeholder?: string;
  required?: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ 
  label, 
  options, 
  selected, 
  onSelect, 
  placeholder,
  required = false 
}) => {
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
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
        {label} {required && '*'}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-white border-2 rounded-2xl px-5 py-3 text-sm font-bold text-slate-700 flex items-center justify-between transition-all shadow-sm ${isOpen ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-50 hover:border-slate-200'}`}
      >
        <span className="truncate">{selected === 'All' || selected === '' ? (placeholder || 'Selecciona') : selected}</span>
        <i className={`fas fa-chevron-down text-xs transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : 'text-slate-400'}`}></i>
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-slate-100 rounded-[1.5rem] shadow-2xl py-3 z-50 animate-scaleIn max-h-[300px] overflow-y-auto custom-scrollbar">
          {options.map((option) => (
            <button
              key={option}
              type="button"
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

export default CustomDropdown;
