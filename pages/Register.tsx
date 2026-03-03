
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';

interface RegisterProps {
  onLogin: (u: User) => void;
}

const Register: React.FC<RegisterProps> = ({ onLogin }) => {
  const [formData, setFormData] = useState({ name: '', email: '', pass: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error(message)), ms);
      })
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.pass.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const signUpPromise = supabase.auth.signUp({
        email: formData.email,
        password: formData.pass,
        options: {
          data: {
            name: formData.name,
            role: 'user'
          }
        }
      });

      const authEventPromise = new Promise<{ data: any; error: any }>((resolve, reject) => {
        let timeoutId: ReturnType<typeof setTimeout>;

        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            clearTimeout(timeoutId);
            listener?.subscription.unsubscribe();
            resolve({ data: { user: session.user }, error: null });
          }
        });

        timeoutId = setTimeout(() => {
          listener?.subscription.unsubscribe();
          reject(new Error('Timeout en registro (evento de autenticación)'));
        }, 10000);
      });

      const { data, error } = await withTimeout(
        Promise.race([signUpPromise, authEventPromise]),
        15000,
        'Timeout al registrar usuario'
      );

      if (error) throw error;
      const authUser = data.user;
      if (!authUser) throw new Error('No se pudo crear el usuario en Supabase.');

      const profile: User = {
        id: authUser.id,
        name: formData.name,
        email: formData.email,
        role: 'user',
        addresses: []
      };

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

      let profileSaved = false;
      try {
        const profileResp = await withTimeout(
          fetch(`${backendUrl}/api/user-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profile)
          }),
          10000,
          'Timeout guardando perfil en backend'
        );

        if (!profileResp.ok) {
          const text = await profileResp.text();
          throw new Error(text || `HTTP ${profileResp.status}`);
        }

        profileSaved = true;
      } catch (backendProfileErr: any) {
        console.warn('[register] backend profile upsert failed, trying direct supabase:', backendProfileErr?.message);
      }

      if (!profileSaved) {
        try {
          const { error: profileError } = await withTimeout(
            supabase
              .from('profiles')
              .upsert({ id: profile.id, name: profile.name, email: profile.email, role: profile.role, addresses: profile.addresses }),
            10000,
            'Timeout guardando perfil'
          );

          if (profileError) {
            console.warn('[register] direct profile upsert failed, continuing with local profile:', profileError.message);
          }
        } catch (directProfileErr: any) {
          console.warn('[register] direct profile upsert timeout/error, continuing with local profile:', directProfileErr?.message);
        }
      }

      localStorage.setItem('dhimma_user', JSON.stringify(profile));
      onLogin(profile);
      navigate('/');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Error al registrar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-20 animate-fadeIn">
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Crea tu cuenta</h1>
          <p className="text-slate-500 text-sm mt-1">Únete a la red de autopartes más grande</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre Completo</label>
            <input 
              type="text" 
              required
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
              placeholder="Juan Pérez"
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</label>
            <input 
              type="email" 
              required
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
              placeholder="correo@ejemplo.com"
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contraseña</label>
            <input 
              type="password" 
              required
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
              placeholder="Mínimo 8 caracteres"
              onChange={(e) => setFormData({...formData, pass: e.target.value})}
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-50 text-center">
          <p className="text-sm text-slate-500">¿Ya tienes cuenta? <Link to="/login" className="text-blue-600 font-bold hover:underline">Inicia Sesión</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;
