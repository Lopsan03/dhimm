
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User } from '../types';
import { COMPANY_INFO } from '../constants';
import logoSrc from '../images/logodhimm.png';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  cartCount: number;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, cartCount }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-3">
          <img src={logoSrc} alt="Dhimma Automotriz" className="h-10 w-auto rounded-md shadow-md" />
          <span className="text-xl font-bold tracking-tight text-slate-800 hidden sm:block uppercase">
            DHIMMA <span className="text-blue-600">AUTOMOTRIZ</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
          <Link to="/" className="hover:text-blue-600 transition-colors">Inicio</Link>
          <Link to="/catalog" className="hover:text-blue-600 transition-colors">Catálogo</Link>
          <a href={COMPANY_INFO.whatsapp} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">Contacto</a>
        </nav>

        {/* Action Icons */}
        <div className="flex items-center space-x-4">
          <Link to="/cart" className="relative p-2 text-slate-600 hover:text-blue-600 transition-colors">
            <i className="fas fa-shopping-cart text-xl"></i>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-2 ring-white">
                {cartCount}
              </span>
            )}
          </Link>

          <div 
            className="relative"
            onMouseEnter={() => setShowProfileMenu(true)}
            onMouseLeave={() => setShowProfileMenu(false)}
          >
            <button className="p-2 text-slate-600 hover:text-blue-600 transition-colors focus:outline-none">
              <i className="fas fa-user-circle text-2xl"></i>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 w-48 bg-white border border-slate-200 rounded-lg shadow-xl py-2 z-50">
                {user ? (
                  <>
                    <div className="px-4 py-2 border-b border-slate-100 mb-1">
                      <p className="text-xs text-slate-400">Hola,</p>
                      <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                    </div>
                    {user.role === 'admin' ? (
                      <Link to="/admin" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Panel Admin</Link>
                    ) : (
                      <>
                        <Link to="/dashboard" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                          <span aria-hidden>📦</span>
                          <span>Mis Pedidos</span>
                        </Link>
                        <Link to="/dashboard/addresses" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                          <span aria-hidden>📍</span>
                          <span>Direcciones</span>
                        </Link>
                      </>
                    )}
                    <button 
                      onClick={onLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Cerrar Sesión
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Iniciar Sesión</Link>
                    <Link to="/register" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Registrarse</Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
