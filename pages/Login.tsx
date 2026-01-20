
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User } from '../types';

interface LoginProps {
  onLogin: (u: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple mock auth logic
    if (email.includes('admin')) {
      onLogin({
        id: 'a1',
        name: 'Administrador Dhimma',
        email: email,
        role: 'admin',
        addresses: []
      });
      navigate('/admin');
    } else {
      onLogin({
        id: 'u1',
        name: 'Juan Pérez',
        email: email,
        role: 'user',
        addresses: ['AV DE LA JUVENTUD #590, Monterrey']
      });
      navigate('/dashboard');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-20 animate-fadeIn">
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
            <i className="fas fa-car-side text-2xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Bienvenido de nuevo</h1>
          <p className="text-slate-500 text-sm mt-1">Ingresa a tu cuenta de Dhimma Automotriz</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</label>
            <input 
              type="email" 
              required
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contraseña</label>
              <button type="button" className="text-[10px] text-blue-600 font-bold uppercase hover:underline">¿Olvidaste tu contraseña?</button>
            </div>
            <input 
              type="password" 
              required
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20 mt-4"
          >
            Iniciar Sesión
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-50 text-center">
          <p className="text-sm text-slate-500">¿No tienes cuenta? <Link to="/register" className="text-blue-600 font-bold hover:underline">Regístrate gratis</Link></p>
        </div>
        <p className="text-[10px] text-center text-slate-300 mt-4">Pista: Usa 'admin' en el email para entrar como administrador.</p>
      </div>
    </div>
  );
};

export default Login;
