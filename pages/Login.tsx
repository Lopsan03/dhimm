
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';

interface LoginProps {
  onLogin: (u: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('[login] attempting sign in with', email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      console.log('[login] auth response:', { error: error?.message, userId: data?.user?.id });
      
      if (error) throw error;

      const authUser = data.user;
      if (!authUser) throw new Error('No se pudo iniciar sesión.');

      console.log('[login] auth success, user id:', authUser.id, 'email:', authUser.email);

      // Try to fetch profile, but don't block on failure
      let profileData: any = null;
      try {
        const { data: pData, error: pError } = await supabase
          .from('profiles')
          .select('id, name, email, role, addresses')
          .eq('id', authUser.id)
          .single();

        if (!pError) {
          profileData = pData;
          console.log('[login] profile fetched successfully');
        } else {
          console.warn('[login] profile fetch error:', pError.message);
        }
      } catch (err: any) {
        console.warn('[login] profile fetch exception:', err.message);
      }

      let user: User;

      if (profileData) {
        user = {
          id: profileData.id,
          name: profileData.name || authUser.email?.split('@')[0] || 'Usuario',
          email: profileData.email,
          role: profileData.role || 'user',
          addresses: profileData.addresses || []
        };
      } else {
        // Fallback: use auth metadata
        console.log('[login] using auth metadata as fallback');
        user = {
          id: authUser.id,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuario',
          email: authUser.email || '',
          role: authUser.user_metadata?.role || 'user',
          addresses: []
        };
      }

      console.log('[login] final user object:', { id: user.id, name: user.name, role: user.role, email: user.email });
      localStorage.setItem('dhimma_user', JSON.stringify(user));
      onLogin(user);

      const redirectTo = user.role === 'admin' ? '/admin' : '/dashboard';
      console.log('[login] navigating to:', redirectTo);
      navigate(redirectTo);
    } catch (err: any) {
      console.error('[login] error:', err.message);
      setError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
      setLoading(false);
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

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

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
              <Link to="/forgot-password" className="text-[10px] text-blue-600 font-bold uppercase hover:underline">¿Olvidaste tu contraseña?</Link>
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
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Iniciando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-50 text-center">
          <p className="text-sm text-slate-500">¿No tienes cuenta? <Link to="/register" className="text-blue-600 font-bold hover:underline">Regístrate gratis</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
