
import React, { useState, useEffect, useCallback } from 'react';
import { Scale, Sparkles, HelpCircle, AlertCircle, CheckCircle2, Key, ArrowRight, Loader2 } from 'lucide-react';
import { COLORS, validateKey, listAvailableModels, fetchVaultKey } from './Parameters';
import { Footer } from './Footer';
import { Cookies } from './Cookies';
import { Ajustes } from './Ajustes';
import { Manual } from './Manual';
import { AppMenu } from './AppMenu';

interface ShellProps {
  children: React.ReactNode;
  apiKey: string;
  onApiKeySave: (key: string) => void;
}

export const Shell: React.FC<ShellProps> = ({ children, apiKey, onApiKeySave }) => {
  const [showAjustes, setShowAjustes] = useState(false);
  const [showCookies, setShowCookies] = useState(false);
  const [showManual, setShowManual] = useState(false);

  // [ESTADOS DE SALUD DEL SISTEMA]
  const [isKeyValid, setIsKeyValid] = useState<boolean | null>(null);
  const [userIp, setUserIp] = useState<string | null>(null);
  const [isVaultRecovering, setIsVaultRecovering] = useState(false);

  const initializeSystem = useCallback(async () => {
    // 1. Detección de IP del Operador e Intento de Auto-Login
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      setUserIp(data.ip);

      // Protocolo de Auto-Acceso por IP Memorizada
      const savedIpsRaw = localStorage.getItem('app_memorized_ips_v2');
      const isAuthStatus = localStorage.getItem('app_is_auth_v2') === 'true';

      if (!isAuthStatus && savedIpsRaw) {
        const savedIps: string[] = JSON.parse(savedIpsRaw);
        const { crypto } = await import('./Parameters');
        const obfuscatedCurrent = crypto.obfuscate(data.ip);
        if (savedIps.includes(obfuscatedCurrent)) {
          console.log("SISTEMA: IP Memorizada detectada. Concediendo acceso automático...");
          localStorage.setItem('app_is_auth_v2', 'true');
          window.location.reload(); // Recarga para que App.tsx lea el nuevo estado
        }
      }
    } catch {
      setUserIp('IP Offline');
    }

    // 2. Gestión de Claves (Estrategia de Recuperación)
    let activeKey = apiKey || localStorage.getItem('app_apikey_v2');
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const isDevMode = !hostname || hostname === 'localhost';

    // Si no hay clave y estamos en modo desarrollo, intentamos rescate del Vault
    if (!activeKey && isDevMode) {
      console.log("SISTEMA: Detectado entorno desarrollo sin clave. Iniciando protocolo de rescate Vault...");
      setIsVaultRecovering(true);
      const recovered = await fetchVaultKey('OK', 'tligent');
      if (recovered) {
        console.log("SISTEMA: Clave 'OK' recuperada y desofuscada con éxito.");
        activeKey = recovered;
        onApiKeySave(recovered); // Sincronizamos hacia arriba y persistimos
      }
      setIsVaultRecovering(false);
    }

    if (!activeKey) {
      setIsKeyValid(false);
      updateLandingUI(false);
      return;
    }

    // 3. Validación del Motor IA (Ping a Gemini)
    const isValid = await validateKey(activeKey);
    setIsKeyValid(isValid);
    updateLandingUI(isValid);

    // 4. Optimización de Modelo (Si es válido)
    if (isValid) {
      const currentModel = localStorage.getItem('app_selected_model');
      if (!currentModel) {
        const models = await listAvailableModels();
        const optimal = models.find(m => m === 'gemini-3-flash-preview') ||
          models.find(m => m.includes('flash-preview')) ||
          models.find(m => m.includes('flash')) ||
          models[0];
        if (optimal) localStorage.setItem('app_selected_model', optimal);
      }
      console.log("SISTEMA: Motor IA validado y activo.");
    } else if (activeKey) {
      console.warn("SISTEMA: API Key detectada pero no es válida para el motor Gemini.");
    }
  }, [apiKey, onApiKeySave]);

  // Actualización reactiva de la interfaz de bienvenida (Landing)
  const updateLandingUI = (valid: boolean) => {
    const badge = document.getElementById('status-ready-badge');
    const bar = document.getElementById('status-progress-bar');
    const text = document.getElementById('status-text');

    if (badge) {
      badge.style.display = valid ? 'block' : 'none';
      badge.classList.add('animate-in', 'zoom-in', 'duration-500');
    }
    if (bar) {
      bar.style.width = valid ? '100%' : '25%';
      if (!valid) bar.classList.add('animate-pulse');
      else bar.classList.remove('animate-pulse');
    }
    if (text) {
      text.innerText = valid ? 'System Active & Persistent' : 'System Standby • Config Required';
      text.classList.toggle('text-red-700', !valid);
    }
  };

  useEffect(() => {
    initializeSystem();
  }, [initializeSystem]);

  return (
    <div className={`min-h-screen ${COLORS.bg} font-sans flex flex-col p-4 md:p-8 animate-in fade-in duration-700`}>
      {/* HEADER DINÁMICO */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md mb-8 border-b border-gray-100 pb-6 pt-4 flex justify-between items-center px-2">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-gray-900 flex items-center gap-2">
            <Scale className="text-red-700" size={32} />
            Simulador<span className="text-red-700"> Vista Oral</span>
          </h1>
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-1.5">
              {isKeyValid === true ? (
                <span className="flex items-center gap-1 text-[9px] font-black text-green-600 uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded-md border border-green-100 animate-in fade-in zoom-in">
                  <CheckCircle2 size={10} /> AI ONLINE
                </span>
              ) : isKeyValid === false ? (
                <span className="flex items-center gap-1 text-[9px] font-black text-red-700 uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded-md border border-red-100 animate-pulse cursor-help">
                  <AlertCircle size={10} /> AI OFFLINE
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded-md">
                  <Sparkles size={10} className="animate-spin text-red-700" /> {isVaultRecovering ? 'VAULT SYNC' : 'SYNCING'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowManual(true)}
            className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-900 px-4 py-2 rounded-xl transition-all active:scale-95 group shadow-sm"
          >
            <HelpCircle size={18} className="text-red-700 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Manual</span>
          </button>
          <AppMenu />
        </div>
      </header>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl mx-auto w-full flex flex-col items-center">

        {/* NOTIFICACIÓN DE MOTOR OFFLINE */}
        {isKeyValid === false && !isVaultRecovering && (
          <div className="w-full max-w-lg bg-white border-2 border-red-700 p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(185,28,28,0.15)] animate-in slide-in-from-top-4 duration-500 mb-12">
            <div className="flex items-center gap-4 mb-5">
              <div className="p-3 bg-red-700 rounded-2xl text-white shadow-lg">
                <Key size={28} />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Acceso IA Restringido</h3>
                <p className="text-[10px] text-red-700 font-bold uppercase tracking-widest">Se requiere acción del usuario</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-8 font-medium">
              No se ha detectado una <span className="text-gray-900 font-bold">Gemini API Key</span> válida en la memoria local ni en el almacén de respaldo.
              Para habilitar las funciones de inteligencia avanzada, debe configurar su clave personal.
            </p>
            <button
              onClick={() => setShowAjustes(true)}
              className="group w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl active:scale-[0.98]"
            >
              Ir a Ajustes para Introducir Clave
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {isVaultRecovering && (
          <div className="w-full max-w-sm bg-white border border-gray-100 p-12 rounded-[2rem] shadow-xl flex flex-col items-center justify-center gap-6 animate-pulse">
            <Loader2 size={48} className="text-red-700 animate-spin" />
            <div className="text-center">
              <h4 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Sincronizando Bóveda</h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Localhost Autorecovery Active</p>
            </div>
          </div>
        )}

        {children}
      </main>

      {/* FOOTER CORPORATIVO */}
      <Footer
        userIp={userIp}
        onShowCookies={() => setShowCookies(true)}
        onShowAjustes={() => setShowAjustes(true)}
      />

      {/* MODALES DE SOPORTE */}
      <Ajustes
        isOpen={showAjustes}
        onClose={() => setShowAjustes(false)}
        apiKey={apiKey}
        onApiKeySave={(key) => {
          onApiKeySave(key);
          initializeSystem(); // Re-validar al guardar
        }}
        userIp={userIp}
      />

      <Cookies isOpen={showCookies} onClose={() => setShowCookies(false)} />
      <Manual isOpen={showManual} onClose={() => setShowManual(false)} />
    </div>
  );
};
