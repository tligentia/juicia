
import React from 'react';
import { Scale, FileText, UserCircle2 } from 'lucide-react';

const Sidebar: React.FC = () => {
  return (
    <div className="hidden lg:flex w-64 bg-white border-r border-gray-100 h-full flex-col p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tighter text-gray-900">
          SIMULADOR<span className="text-red-700">VISTA ORAL</span>
        </h1>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em]">Sistema de Litigio IA</p>
      </div>
      
      <div className="space-y-6">
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-2 mb-2 text-red-700">
            <Scale size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Estado</span>
          </div>
          <div className="text-xs font-bold text-gray-900">En Sesión</div>
          <div className="w-full bg-gray-200 h-1 mt-2 rounded-full overflow-hidden">
             <div className="w-full h-full bg-red-700 animate-pulse"></div>
          </div>
        </div>

        <div className="space-y-4">
           <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Guía Rápida</h3>
           
           <div className="flex items-start gap-3 text-sm text-gray-600">
              <UserCircle2 size={16} className="mt-0.5 text-gray-400" />
              <div>
                 <strong className="text-gray-900 block text-xs">Tu Rol</strong>
                 <p className="text-[11px] leading-tight">Mantén tu personaje. El sistema penaliza la incoherencia.</p>
              </div>
           </div>

           <div className="flex items-start gap-3 text-sm text-gray-600">
              <FileText size={16} className="mt-0.5 text-gray-400" />
              <div>
                 <strong className="text-gray-900 block text-xs">Expedientes</strong>
                 <p className="text-[11px] leading-tight">Sube PDFs o Imágenes de pruebas para que el tribunal los analice.</p>
              </div>
           </div>
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-bold">
            JD
          </div>
          <div>
            <div className="text-xs font-bold text-gray-900">Usuario</div>
            <div className="text-[10px] text-gray-400">Licencia Tligent</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
