import React, { useState } from 'react';
import { apiFetch as fetch } from '../api';
import { ShieldCheck, Eye, EyeOff, Lock, User, RefreshCw, Layers } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginScreenProps {
  onLoginSuccess: (token: string, user: { id: number; usuario: string; rol: string; sucursal: string }) => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario.trim() || !contrasena.trim()) {
      setErr('Por favor ingrese usuario y contraseña.');
      return;
    }

    setLoading(true);
    setErr('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usuario, contrasena }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErr(data.error || 'Usuario o contraseña incorrectos.');
        setLoading(false);
        return;
      }

      onLoginSuccess(data.token, data.user);
    } catch (error) {
      console.error('Error logging in:', error);
      setErr('Error de conexión con el servidor. Intente nuevamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-deep flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans transition-colors duration-500 relative overflow-hidden">
      {/* Exquisite Floating Ambient Particles (Gold & Deep Cobalt dust) */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <motion.div 
          animate={{
            scale: [1, 1.15, 0.95, 1.05, 1],
            opacity: [0.15, 0.25, 0.12, 0.2, 0.15],
            rotate: [0, 15, -10, 5, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(212,165,90,0.12),transparent_45%),radial-gradient(circle_at_75%_75%,rgba(230,191,118,0.08),transparent_50%)]" 
        />
        
        {/* Visual Luxury Accents */}
        <div className="absolute top-[10%] left-[20%] w-72 h-72 rounded-full bg-brand-gold/5 blur-[120px]" />
        <div className="absolute bottom-[15%] right-[25%] w-80 h-80 rounded-full bg-brand-lightgold/5 blur-[140px]" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <motion.div 
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 140, damping: 14 }}
          className="flex justify-center"
        >
          <motion.div 
            animate={{ 
              scale: [1, 1.04, 1],
              boxShadow: [
                "0 0 0px rgba(212,165,90,0)",
                "0 0 30px rgba(212,165,90,0.25)",
                "0 0 0px rgba(212,165,90,0)"
              ]
            }}
            transition={{ 
              duration: 5, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="bg-brand-cobalt p-4 rounded-2xl border border-brand-gold/20 shadow-[0_12px_40px_rgba(0,0,0,0.5)] flex items-center justify-center"
          >
            <ShieldCheck className="h-8 w-8 text-brand-gold" />
          </motion.div>
        </motion.div>

        <motion.h2 
          initial={{ y: -15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 110 }}
          className="mt-6 text-center text-4xl font-black tracking-tight text-brand-crema font-display"
        >
          Sistema <span className="text-brand-gold italic font-display">Juem</span>
        </motion.h2>
        
        <motion.p 
          initial={{ y: -5, opacity: 0 }}
          animate={{ y: 0, opacity: 0.8 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="mt-2 text-center text-[10px] text-brand-lightgold font-sans tracking-[0.25em] uppercase font-bold"
        >
          Portal Directivo de Alta Gama & Control de Inventario
        </motion.p>
      </div>

      <motion.div 
        initial={{ y: 35, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35, type: "spring", stiffness: 100, damping: 16 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative px-4 sm:px-0 z-10"
      >
        <div className="bg-brand-cobalt py-10 px-6 sm:px-10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-2xl border border-brand-gold/25 relative overflow-hidden transition-all duration-300">
          {/* Top animated gold border indicator */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brand-gold to-transparent opacity-90 animate-pulse" />
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            {err && (
              <motion.div 
                id="login-error"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: 1,
                  x: [0, -8, 8, -8, 8, 0]
                }}
                transition={{ 
                  x: { duration: 0.35, ease: "easeOut" },
                  scale: { duration: 0.2 }
                }}
                className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-ping shrink-0" />
                <span className="font-sans font-medium">{err}</span>
              </motion.div>
            )}

            <motion.div
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.45 }}
            >
              <label className="block text-xs font-bold text-brand-lightgold uppercase tracking-wider mb-2 font-sans select-none">
                Usuario
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-brand-lightgold/60" />
                </div>
                <input
                  id="login-user"
                  type="text"
                  required
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-brand-deep border border-brand-gold/15 rounded-xl text-brand-crema placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold text-sm font-sans transition-all"
                  placeholder="Usuario del sistema"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.55 }}
            >
              <label className="block text-xs font-bold text-brand-lightgold uppercase tracking-wider mb-2 font-sans select-none">
                Contraseña
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-brand-lightgold/60" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 bg-brand-deep border border-brand-gold/15 rounded-xl text-brand-crema placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold text-sm font-sans transition-all"
                  placeholder="••••••••"
                />
                <button
                  id="toggle-password-visibility"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-lightgold/60 hover:text-brand-lightgold focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65 }}
              className="flex items-center justify-between pointer-events-none select-none"
            >
              <span className="text-[10px] text-slate-500 font-sans leading-tight">
                Acceso corporativo encriptado y autorizado.
              </span>
            </motion.div>

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <motion.button
                id="submit-login"
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-[0_4px_20px_rgba(212,165,90,0.15)] text-xs uppercase tracking-widest font-extrabold text-brand-deep bg-brand-gold hover:bg-brand-lightgold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-deep focus:ring-brand-gold disabled:opacity-50 transition-all font-sans cursor-pointer whitespace-nowrap active:scale-95 duration-200"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 text-brand-deep animate-spin" />
                ) : (
                  'Iniciar Sesión'
                )}
              </motion.button>
            </motion.div>
          </form>
        </div>
      </motion.div>
      
      <div className="mt-8 text-center text-slate-600 text-[10px] relative z-10 pointer-events-none select-none tracking-wider font-sans">
        © {new Date().getFullYear()} Sistema Juem. Todos los derechos reservados.
      </div>
    </div>
  );
}
