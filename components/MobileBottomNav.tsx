
import React from 'react';
import { NavLink } from 'react-router-dom';

const MobileBottomNav: React.FC = () => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center h-16 z-40 px-4">
      <NavLink 
        to="/" 
        className={({ isActive }) => `flex flex-col items-center space-y-1 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
      >
        <i className="fas fa-home text-lg"></i>
        <span className="text-[10px] font-medium">Inicio</span>
      </NavLink>
      <NavLink 
        to="/catalog" 
        className={({ isActive }) => `flex flex-col items-center space-y-1 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
      >
        <i className="fas fa-th-large text-lg"></i>
        <span className="text-[10px] font-medium">Catálogo</span>
      </NavLink>
      <NavLink 
        to="/cart" 
        className={({ isActive }) => `flex flex-col items-center space-y-1 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
      >
        <i className="fas fa-shopping-cart text-lg"></i>
        <span className="text-[10px] font-medium">Carrito</span>
      </NavLink>
      <NavLink 
        to="/dashboard" 
        className={({ isActive }) => `flex flex-col items-center space-y-1 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
      >
        <i className="fas fa-user text-lg"></i>
        <span className="text-[10px] font-medium">Perfil</span>
      </NavLink>
    </nav>
  );
};

export default MobileBottomNav;
