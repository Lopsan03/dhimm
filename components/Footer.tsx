
import React from 'react';
import { Link } from 'react-router-dom';
import { COMPANY_INFO } from '../constants';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-12 pb-24 md:pb-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="space-y-4">
            <Link to="/" className="flex items-center space-x-2 text-white">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <i className="fas fa-car-side"></i>
              </div>
              <span className="text-xl font-bold tracking-tight">
                DHIMMA <span className="text-blue-500">AUTO</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-slate-400">
              {COMPANY_INFO.description}
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Navegación</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-blue-400 transition-colors">Inicio</Link></li>
              <li><Link to="/catalog" className="hover:text-blue-400 transition-colors">Catálogo</Link></li>
              <li><a href={COMPANY_INFO.whatsapp} className="hover:text-blue-400 transition-colors">Contacto</a></li>
              <li><Link to="/login" className="hover:text-blue-400 transition-colors">Mi Cuenta</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Contacto</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <i className="fas fa-map-marker-alt text-blue-500"></i>
                <span>{COMPANY_INFO.address}</span>
              </li>
              <li className="flex items-center gap-2">
                <i className="fas fa-phone-alt text-blue-500"></i>
                <span>{COMPANY_INFO.phone}</span>
              </li>
              <li className="flex items-center gap-2">
                <i className="fas fa-envelope text-blue-500"></i>
                <span>{COMPANY_INFO.email}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Redes Sociales</h4>
            <div className="flex gap-4">
              <a href="https://www.facebook.com/DHIMMAOFICIAL/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-slate-800 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-all transform hover:scale-110 text-slate-300 hover:text-white">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="https://www.instagram.com/dhimmaautomotriz?igsh=MWlwaXNqcmc5MHFrYw==" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-slate-800 hover:bg-pink-600 rounded-lg flex items-center justify-center transition-all transform hover:scale-110 text-slate-300 hover:text-white">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="https://www.tiktok.com/@automotriz.dhimma" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-all transform hover:scale-110 text-slate-300 hover:text-white">
                <i className="fab fa-tiktok"></i>
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>© 2024 Dhimma Automotriz. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacidad</a>
            <a href="#" className="hover:text-white transition-colors">Términos</a>
            <a href="#" className="hover:text-white transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
