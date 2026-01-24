
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
      console.log('[login] 1. starting sign in with', email);
      
      const signInPromise = supabase.auth.signInWithPassword({ email, password });
      console.log('[login] 2. signInWithPassword promise created');

      // Fallback: resolve when auth state change fires SIGNED_IN in case supabase promise hangs
      const authEventPromise = new Promise<{ data: any; error: any }>((resolve, reject) => {
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('[login] 2b. auth SIGNED_IN event for user', session.user.id);
            listener?.subscription.unsubscribe();
            resolve({ data: { user: session.user }, error: null });
          }
        });

        setTimeout(() => {
          console.warn('[login] timeout waiting for SIGNED_IN event (10s)');
          listener?.subscription.unsubscribe();
          reject(new Error('Timeout en inicio de sesión (evento)'));
        }, 10000);
      });

      const { data, error } = await Promise.race([signInPromise, authEventPromise]);
      console.log('[login] 3. resolved auth flow, error:', (error as any)?.message, 'user:', (data as any)?.user?.id);
      console.log('[login] 3b. typeof data:', typeof data, 'typeof error:', typeof error);
      
      if (error) {
        console.log('[login] 4a. error from signInWithPassword, error code:', error.status, 'message:', error.message);
        setLoading(false);
        throw error;
      }

      console.log('[login] 4b. no error, checking data:', !!data);
      
      if (!data || !data.user) {
        console.log('[login] 5a. data.user is null/undefined');
        setLoading(false);
        throw new Error('No se pudo iniciar sesión. Intenta de nuevo.');
      }

      const authUser = data.user;
      console.log('[login] 5b. authUser retrieved:', authUser.id);
      
      console.log('[login] 6. fetching profile for user', authUser.id);
      let profileData: any = null;
      
      const { data: pData, error: pError } = await supabase
        .from('profiles')
        .select('id, name, email, role, addresses')
        .eq('id', authUser.id)
        .single();

      console.log('[login] 7. profile query completed:', { hasError: !!pError, hasData: !!pData });
      
      if (pData) {
        profileData = pData;
        console.log('[login] 8. profile found:', profileData.id);
      } else if (pError) {
        console.warn('[login] 8. profile query error (not fatal):', pError.code, pError.message);
      }

      console.log('[login] 9. building user object');
      const user: User = {
        id: authUser.id,
        name: profileData?.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuario',
        email: profileData?.email || authUser.email || '',
        role: profileData?.role || authUser.user_metadata?.role || 'user',
        addresses: profileData?.addresses || []
      };

      console.log('[login] 10. user object complete:', { id: user.id, role: user.role });
      localStorage.setItem('dhimma_user', JSON.stringify(user));
      console.log('[login] 11. localStorage set');
      
      console.log('[login] 12. calling onLogin');
      onLogin(user);
      
      console.log('[login] 13. preparing redirect to', user.role === 'admin' ? '/admin' : '/dashboard');
      setLoading(false);
      
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
      console.log('[login] 14. navigation initiated');
    } catch (err: any) {
      console.error('[login] ERROR:', err.message);
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
