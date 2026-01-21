import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    let mounted = true;

    const handleAuthCallback = async () => {
      try {
        // Log the full URL to see what we're getting
        console.log('Full URL:', window.location.href);
        
        // Parse tokens from hash fragment (Supabase puts them after the second #)
        const hash = window.location.hash;
        const hashParams = new URLSearchParams(hash.split('#')[2] || '');
        
        // Also check URL search params for compatibility
        const urlParams = new URLSearchParams(window.location.search);
        
        // Merge both sources
        const params = new Map();
        searchParams.forEach((value, key) => params.set(key, value));
        hashParams.forEach((value, key) => params.set(key, value));
        urlParams.forEach((value, key) => params.set(key, value));
        
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const code = params.get('code');
        const type = params.get('type');
        const token = params.get('token');

        console.log('Extracted params:', { type, accessToken: !!accessToken, refreshToken: !!refreshToken, code: !!code });

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          console.log('Auth state change event:', event, session ? 'session present' : 'no session');
          if (session && mounted && event === 'SIGNED_IN') {
            console.log('Session details:', { user: session.user.id, expires_at: session.expires_at });
            setCurrentSession(session);
            setSessionReady(true);
          }
        });

        // If we have recovery tokens, set the session
        if (type === 'recovery' && accessToken && refreshToken) {
          console.log('Setting session from recovery tokens...');
          
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('Session set error:', sessionError);
            setError('Enlace de recuperación inválido o expirado. Por favor solicita uno nuevo.');
          } else if (data.session && mounted) {
            console.log('Recovery session set successfully');
            setCurrentSession(data.session);
            setSessionReady(true);
          }
        } else if (type === 'recovery' && code) {
          // Fallback: try OTP verification
          console.log('Using verifyOtp with recovery code');
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            type: 'recovery',
            token_hash: code,
            options: {}
          });

          if (verifyError) {
            console.error('OTP verify error:', verifyError);
            setError('Enlace de recuperación inválido o expirado. Por favor solicita uno nuevo.');
          } else if (data.session && mounted) {
            console.log('Recovery session established via verifyOtp');
            setCurrentSession(data.session);
            setSessionReady(true);
          }
        } else {
          // Try to get existing session
          const { data } = await supabase.auth.getSession();
          if (data.session && mounted) {
            setCurrentSession(data.session);
            setSessionReady(true);
          } else if (mounted) {
            setError('Enlace de recuperación no encontrado. Por favor solicita uno nuevo.');
          }
        }

        return () => subscription?.unsubscribe();
      } catch (err: any) {
        console.error('Auth callback error:', err);
        if (mounted) setError('Error al procesar tu enlace de recuperación.');
      }
    };

    handleAuthCallback();

    return () => {
      mounted = false;
    };
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      console.log('Updating password...');
      
      // Just use the current session - don't try to refresh it
      if (!currentSession) {
        throw new Error('No hay sesión válida. Por favor solicita un nuevo enlace.');
      }
      
      console.log('Using session for user:', currentSession.user.id);
      
      // Update password directly
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      
      if (updateError) {
        console.error('Update error details:', updateError);
        throw updateError;
      }

      setSuccess('Contraseña actualizada correctamente. Redirigiendo al login...');
      
      // Sign out to force fresh login with new password
      await supabase.auth.signOut();
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      console.error('Update password error:', err);
      setError(err.message || 'Error al actualizar la contraseña. Intenta solicitar un nuevo enlace.');
      setLoading(false);
    }
  };

  if (!sessionReady) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 animate-fadeIn">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
              <i className="fas fa-spinner text-2xl animate-spin"></i>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Cargando...</h1>
            <p className="text-slate-500 text-sm mt-1">Verificando tu enlace de recuperación</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-20 animate-fadeIn">
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
            <i className="fas fa-lock text-2xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Nueva contraseña</h1>
          <p className="text-slate-500 text-sm mt-1">Establece una nueva contraseña para tu cuenta</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-2xl">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nueva contraseña</label>
            <input 
              type="password" 
              required
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Confirmar contraseña</label>
            <input 
              type="password" 
              required
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
              placeholder="Repite tu contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
