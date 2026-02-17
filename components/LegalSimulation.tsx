
import React, { useState, useRef, useEffect } from 'react';
import { SimulationService, DashboardMetrics, Attachment } from '../services/simulationService';
import { Message } from '../types';
import { Send, Sparkles, Flame, RefreshCcw, Paperclip, X, FileText, Image as ImageIcon, BrainCircuit, Lightbulb, Loader2, TrendingUp, Activity, Gavel, Scale, Layers, Shield, User, Briefcase, FileSearch, PlayCircle } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface Props {
  apiKey: string;
}

interface UploadedFile {
    name: string;
    data: string;
    type: string;
}

// Simple Markdown Parser for nice HTML rendering
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const processText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
        const trimmed = line.trim();
        // Headers
        if (line.startsWith('### ')) return <h3 key={idx} className="text-sm font-black text-gray-800 uppercase tracking-wide mt-4 mb-2">{line.slice(4)}</h3>;
        if (line.startsWith('## ')) return <h2 key={idx} className="text-base font-black text-red-700 mt-5 mb-3 border-b border-gray-100 pb-1">{line.slice(3)}</h2>;
        if (line.startsWith('# ')) return <h1 key={idx} className="text-lg font-black text-gray-900 mt-6 mb-4">{line.slice(2)}</h1>;

        // Separators (converted from ASCII)
        if (line.includes('════') || line.includes('────') || line.includes('━━━')) return <hr key={idx} className="my-4 border-gray-200 border-dashed" />;

        // List items
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
            return (
                <div key={idx} className="flex gap-2 ml-2 mb-1 items-start">
                    <span className="text-red-700 mt-1.5 w-1.5 h-1.5 bg-red-700 rounded-full flex-shrink-0" />
                    <p className="text-sm text-gray-700 leading-relaxed">{processInline(trimmed.slice(2))}</p>
                </div>
            );
        }
        
        // Numbered lists
        if (/^\d+\./.test(trimmed)) {
             const parts = trimmed.split('.');
             const num = parts[0];
             const rest = parts.slice(1).join('.');
             return (
                <div key={idx} className="flex gap-2 ml-2 mb-1 items-start">
                    <span className="font-mono text-xs font-bold text-gray-400 mt-0.5">{num}.</span>
                    <p className="text-sm text-gray-700 leading-relaxed">{processInline(rest)}</p>
                </div>
            );
        }

        // Empty lines
        if (trimmed === '') return <div key={idx} className="h-2" />;

        // Paragraphs
        return <p key={idx} className="mb-2 text-sm text-gray-700 leading-relaxed">{processInline(line)}</p>;
    });
  };

  const processInline = (text: string) => {
     // Bold **text**
     const parts = text.split(/(\*\*.*?\*\*)/g);
     return parts.map((part, i) => {
         if (part.startsWith('**') && part.endsWith('**')) {
             return <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
         }
         return part;
     });
  };

  return <div className="font-sans">{processText(content)}</div>;
};

// --- DATA CONSTANTS FOR SETUP ---
const ROLES = [
  { id: 'Juez', icon: <Gavel size={20} />, desc: 'Imparte justicia y sentencia.' },
  { id: 'Fiscal', icon: <Briefcase size={20} />, desc: 'Representa al estado y acusa.' },
  { id: 'Acusación', icon: <Scale size={20} />, desc: 'Representa intereses de la víctima.' },
  { id: 'Abogado Defensor', icon: <Shield size={20} />, desc: 'Construye la defensa estratégica.' },
  { id: 'Acusado', icon: <User size={20} />, desc: 'Defiende tu inocencia.' },
  { id: 'Perito', icon: <FileSearch size={20} />, desc: 'Aporta análisis técnico experto.' },
];

const PRESET_CASES = [
  { id: 'fraude', title: 'Fraude Corporativo', desc: 'Desfalco millonario tecnológico.' },
  { id: 'homicidio', title: 'Homicidio 2º Grado', desc: 'Incidente en defensa propia.' },
  { id: 'negligencia', title: 'Negligencia Médica', desc: 'Error quirúrgico fatal.' },
  { id: 'propiedad', title: 'Propiedad Intelectual', desc: 'Robo de algoritmo IA.' },
];

const LegalSimulation: React.FC<Props> = ({ apiKey }) => {
  const [simulation, setSimulation] = useState<SimulationService | null>(null);
  
  // States for UI Logic
  const [appState, setAppState] = useState<'setup' | 'active'>('setup');
  const [setupStep, setSetupStep] = useState<1 | 2>(1); // 1: Roles, 2: Case
  
  // Setup Selection State
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedCase, setSelectedCase] = useState<string>(''); // 'custom' or preset id
  const [customCaseText, setCustomCaseText] = useState('');
  
  // Chat & Logic State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefining, setIsRefining] = useState(false); 
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);
  
  // Dashboard Metrics State
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [historyData, setHistoryData] = useState<{turn: number, prob: number}[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setupFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (apiKey && !simulation) {
      const sim = new SimulationService(apiKey);
      setSimulation(sim);
    }
  }, [apiKey, simulation]);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current && appState === 'active') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, appState]);

  // Update metrics
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].role === 'assistant' && simulation && appState === 'active') {
        updateDashboard();
    }
  }, [messages, simulation, appState]);

  const updateDashboard = async () => {
    if (!simulation) return;
    try {
        const historyText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
        const data = await simulation.getDashboardMetrics(historyText);
        setMetrics(data);
        setHistoryData(prev => [...prev, { turn: prev.length + 1, prob: data.successProbability }]);
    } catch (e) { console.error(e); }
  };

  const handleFileProcess = async (files: FileList | null, isSetup: boolean) => {
     if (!files || files.length === 0) return;
     const newFiles: UploadedFile[] = [];
     const filePromises = Array.from(files).map((file: File) => {
         return new Promise<UploadedFile>((resolve) => {
             const reader = new FileReader();
             reader.onloadend = () => {
                 const base64String = (reader.result as string).split(',')[1];
                 resolve({ name: file.name, data: base64String, type: file.type });
             };
             reader.readAsDataURL(file);
         });
     });
     const processed = await Promise.all(filePromises);
     setAttachedFiles(prev => [...prev, ...processed]);
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const initializeSimulation = async () => {
    if (!simulation) return;
    setAppState('active');
    setIsLoading(true);

    try {
        let caseDescription = selectedCase;
        if (selectedCase === 'custom') caseDescription = customCaseText;
        else if (selectedCase === 'documents') caseDescription = `Caso basado EXCLUSIVAMENTE en los ${attachedFiles.length} documentos adjuntos. Analízalos y genera el caso.`;
        else {
             const preset = PRESET_CASES.find(c => c.id === selectedCase);
             caseDescription = preset ? `${preset.title}: ${preset.desc}` : selectedCase;
        }

        const attachmentsPayload: Attachment[] = attachedFiles.map(f => ({
            inlineData: { data: f.data, mimeType: f.type }
        }));

        const response = await simulation.startCustomSimulation(selectedRole, caseDescription, attachmentsPayload);
        
        setAttachedFiles([]); // Clear setup files
        addMessage('assistant', response);
    } catch (e) {
        setAppState('setup'); // Revert on error
        alert("Error al iniciar. Verifica la API Key.");
    } finally {
        setIsLoading(false);
    }
  };

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date()
    }]);
  };

  const formatContent = (content: string) => {
    return <MarkdownRenderer content={content} />;
  };

  const handleSuggestion = async () => {
    if (!simulation) return;
    setIsRefining(true);
    try {
        const historyText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
        const suggestion = await simulation.getStrategicSuggestion(historyText);
        setInput(suggestion);
    } catch (e) {
        console.error(e);
    } finally {
        setIsRefining(false);
    }
  };

  const handleRewrite = async () => {
    if (!simulation || !input.trim()) return;
    setIsRefining(true);
    try {
        const refined = await simulation.refineArgument(input);
        setInput(refined);
    } catch (e) {
        console.error(e);
    } finally {
        setIsRefining(false);
    }
  };

  const handleSend = async (text: string = input) => {
    if ((!text.trim() && attachedFiles.length === 0) || !simulation || isLoading) return;

    let displayMessage = text;
    if (attachedFiles.length > 0) {
        const fileNames = attachedFiles.map(f => f.name).join(', ');
        displayMessage = `${text ? text + '\n' : ''}[${attachedFiles.length} Archivos Adjuntos: ${fileNames}]`;
    }

    addMessage('user', displayMessage);
    setInput('');
    const filesToSend = [...attachedFiles]; 
    setAttachedFiles([]); 
    
    setIsLoading(true);

    try {
      const attachmentsPayload: Attachment[] = filesToSend.map(f => ({
          inlineData: { data: f.data, mimeType: f.type }
      }));
      const response = await simulation.sendMessage(text || `Analiza estos documentos.`, attachmentsPayload);
      addMessage('assistant', response);
    } catch (error) {
      addMessage('assistant', 'Error procesando respuesta.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- RENDER: SETUP WIZARD (Compact Version) ---
  if (appState === 'setup') {
    return (
        <div className="flex flex-col h-[65vh] max-w-5xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200 font-sans">
             {/* Setup Header */}
             <div className="bg-gray-50 border-b border-gray-100 p-4 text-center">
                 <h2 className="text-lg font-black uppercase tracking-tighter text-gray-900 mb-1">Configuración del Juicio</h2>
                 <div className="flex justify-center gap-1.5">
                     <div className={`h-1 w-8 rounded-full transition-colors ${setupStep === 1 ? 'bg-red-700' : 'bg-gray-200'}`}></div>
                     <div className={`h-1 w-8 rounded-full transition-colors ${setupStep === 2 ? 'bg-red-700' : 'bg-gray-200'}`}></div>
                 </div>
             </div>

             <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                 {setupStep === 1 ? (
                     <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                         <h3 className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Paso 1: Elige tu Rol</h3>
                         
                         {/* Compact Grid: 2 columns mobile, 3 columns desktop for 6 items */}
                         <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                             {ROLES.map(role => (
                                 <button
                                     key={role.id}
                                     onClick={() => { setSelectedRole(role.id); setSetupStep(2); }}
                                     className="group relative flex flex-col items-center p-3 border border-gray-100 rounded-xl hover:border-red-700 hover:bg-red-50/10 transition-all text-center active:scale-[0.98]"
                                 >
                                     <div className="mb-2 text-gray-900 group-hover:text-red-700 transition-colors bg-gray-50 p-2.5 rounded-full">
                                         {role.icon}
                                     </div>
                                     <h4 className="font-bold text-xs uppercase text-gray-900 mb-0.5">{role.id}</h4>
                                     <p className="text-[10px] text-gray-500 leading-tight">{role.desc}</p>
                                 </button>
                             ))}
                         </div>
                     </div>
                 ) : (
                     <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                         <div className="flex items-center justify-between mb-2">
                            <button onClick={() => setSetupStep(1)} className="text-[10px] font-bold text-gray-400 hover:text-gray-900 uppercase flex items-center gap-1">← Volver</button>
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Paso 2: Elige el Caso</h3>
                         </div>
                         
                         {/* Preset Cases - Dense Grid */}
                         <div className="grid grid-cols-2 gap-3 mb-4">
                             {PRESET_CASES.map(c => (
                                 <button
                                     key={c.id}
                                     onClick={() => setSelectedCase(c.id)}
                                     className={`p-3 rounded-xl border text-left transition-all active:scale-[0.98] ${selectedCase === c.id ? 'border-red-700 bg-red-50/20' : 'border-gray-100 hover:border-gray-300'}`}
                                 >
                                     <div className="flex items-center justify-between mb-0.5">
                                        <span className="font-bold text-xs text-gray-900 truncate pr-2">{c.title}</span>
                                        {selectedCase === c.id && <div className="w-1.5 h-1.5 bg-red-700 rounded-full flex-shrink-0"></div>}
                                     </div>
                                     <p className="text-[10px] text-gray-500 leading-tight">{c.desc}</p>
                                 </button>
                             ))}
                         </div>

                         {/* Custom / Upload Options - Tighter Layout */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                             <div 
                                onClick={() => setSelectedCase('custom')}
                                className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedCase === 'custom' ? 'border-red-700 bg-red-50/20' : 'border-gray-100 hover:border-gray-300'}`}
                             >
                                 <div className="flex items-center gap-2 mb-1">
                                     <FileText size={14} className="text-gray-700" />
                                     <span className="font-bold text-xs text-gray-900">Caso Personalizado</span>
                                 </div>
                                 {selectedCase === 'custom' ? (
                                     <textarea
                                         value={customCaseText}
                                         onChange={(e) => setCustomCaseText(e.target.value)}
                                         placeholder="Describe el caso..."
                                         className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-red-700 outline-none h-16 mt-1 resize-none"
                                         onClick={(e) => e.stopPropagation()}
                                     />
                                 ) : (
                                    <p className="text-[10px] text-gray-400">Escribe tu propia narrativa.</p>
                                 )}
                             </div>

                             <div 
                                onClick={() => setSelectedCase('documents')}
                                className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedCase === 'documents' ? 'border-red-700 bg-red-50/20' : 'border-gray-100 hover:border-gray-300'}`}
                             >
                                 <div className="flex items-center gap-2 mb-1">
                                     <FileSearch size={14} className="text-gray-700" />
                                     <span className="font-bold text-xs text-gray-900">Desde Documentos</span>
                                 </div>
                                 
                                 {selectedCase === 'documents' ? (
                                     <div className="mt-1">
                                         <input 
                                             type="file" 
                                             multiple
                                             ref={setupFileInputRef}
                                             className="hidden" 
                                             onChange={(e) => handleFileProcess(e.target.files, true)}
                                         />
                                         <div className="flex flex-wrap gap-1 mb-1 max-h-10 overflow-y-auto">
                                             {attachedFiles.map((f, i) => (
                                                 <span key={i} className="text-[9px] bg-white border border-gray-200 px-1.5 py-0.5 rounded flex items-center gap-1 truncate max-w-[100px]">
                                                     {f.name} <button onClick={(e) => { e.stopPropagation(); removeFile(i); }}><X size={8}/></button>
                                                 </span>
                                             ))}
                                         </div>
                                         <button 
                                            onClick={(e) => { e.stopPropagation(); setupFileInputRef.current?.click(); }}
                                            className="text-[9px] bg-gray-900 text-white px-2 py-1 rounded font-bold uppercase tracking-wider hover:bg-black"
                                         >
                                             + Subir
                                         </button>
                                     </div>
                                 ) : (
                                    <p className="text-[10px] text-gray-400">Sube PDFs o imágenes.</p>
                                 )}
                             </div>
                         </div>
                     </div>
                 )}
             </div>

             {/* Footer Actions */}
             <div className="p-4 bg-white border-t border-gray-100 flex justify-end">
                 {setupStep === 2 && (
                     <button
                         onClick={initializeSimulation}
                         disabled={!selectedCase || (selectedCase === 'custom' && !customCaseText) || (selectedCase === 'documents' && attachedFiles.length === 0)}
                         className="flex items-center gap-2 bg-red-700 hover:bg-red-800 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-700/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                         <PlayCircle size={16} /> Iniciar Juicio
                     </button>
                 )}
             </div>
        </div>
    );
  }

  // --- RENDER: ACTIVE COURTROOM (Original UI) ---
  return (
    <div className="flex flex-col h-[65vh] max-w-5xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200">
      {/* Header Dashboard Complex */}
      <header className="border-b border-gray-100 bg-gray-50/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
            
            {/* Left: Branding & Controls */}
            <div className="flex items-center justify-between md:justify-start gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-700 rounded-full animate-pulse"></div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-gray-900">Sala de Audiencias</h2>
                </div>
                <div className="hidden md:flex items-center gap-2 text-[10px] font-bold text-gray-400 bg-white px-2 py-1 rounded border border-gray-100">
                    <span className="text-gray-900">{selectedRole}</span>
                    <span>•</span>
                    <span className="uppercase truncate max-w-[100px]">{selectedCase === 'custom' ? 'Caso Personalizado' : (PRESET_CASES.find(c => c.id === selectedCase)?.title || 'Caso Documental')}</span>
                </div>
                <button 
                  onClick={() => setAppState('setup')} // Go back to setup
                  className="text-[10px] font-bold text-gray-400 hover:text-red-700 flex items-center gap-1 transition-colors bg-white px-2 py-1 rounded-lg border border-gray-100 shadow-sm"
                >
                  <RefreshCcw size={10} /> REINICIO
                </button>
            </div>

            {/* Right: Analytical Dashboard */}
            {metrics ? (
                <div className="flex-1 flex items-center justify-end gap-2 md:gap-6 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                    {/* 1. Evolución (Chart) */}
                    <div className="flex flex-col h-full justify-center min-w-[80px]">
                        <div className="flex items-center gap-1 mb-0.5">
                            <TrendingUp size={10} className="text-gray-400" />
                            <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Evolución</span>
                        </div>
                        <div className="h-[25px] w-[100px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={historyData}>
                                    <Line type="monotone" dataKey="prob" stroke="#b91c1c" strokeWidth={2} dot={false} />
                                    <YAxis domain={[0, 100]} hide />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-8 bg-gray-200 hidden md:block"></div>

                    {/* 2. Argumentos (Progress) */}
                    <div className="flex flex-col min-w-[100px]">
                        <div className="flex items-center justify-between mb-1">
                             <div className="flex items-center gap-1">
                                <Gavel size={10} className="text-gray-400" />
                                <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Argumentos</span>
                             </div>
                             <span className="text-[9px] font-black text-gray-900">{metrics.argumentStrength}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div 
                                className="bg-gray-900 h-full rounded-full transition-all duration-700" 
                                style={{ width: `${metrics.argumentStrength}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-8 bg-gray-200 hidden md:block"></div>

                    {/* 3. Sentimiento (Badge) */}
                    <div className="flex flex-col items-start min-w-[90px]">
                        <div className="flex items-center gap-1 mb-1">
                            <Activity size={10} className="text-gray-400" />
                            <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Sentimiento</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                                metrics.sentimentScore > 20 ? 'bg-green-500' : 
                                metrics.sentimentScore < -20 ? 'bg-red-700' : 'bg-yellow-500'
                            }`}></div>
                            <span className="text-[10px] font-black text-gray-900 uppercase truncate max-w-[80px]">
                                {metrics.sentimentLabel}
                            </span>
                        </div>
                    </div>

                    {/* 4. Probabilidad (Circle) */}
                     <div className="bg-gray-900 text-white p-2 rounded-xl flex flex-col items-center justify-center min-w-[50px]">
                        <span className="text-[8px] font-black uppercase text-gray-400">Éxito</span>
                        <span className={`text-xs font-black ${metrics.successProbability > 70 ? 'text-green-400' : 'text-white'}`}>
                            {metrics.successProbability}%
                        </span>
                     </div>
                </div>
            ) : (
                <div className="flex-1 flex justify-end items-center opacity-50">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Scale size={14} className="animate-pulse" />
                        Esperando Análisis Inicial...
                    </span>
                </div>
            )}
        </div>
      </header>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar bg-white">
        {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 opacity-50">
                <div className="text-4xl mb-4">⚖️</div>
                <p className="text-xs font-black uppercase tracking-widest">Iniciando Protocolo Judicial...</p>
            </div>
        )}
        
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[95%] md:max-w-[85%] rounded-2xl p-5 shadow-sm transition-all ${
              m.role === 'user' 
                ? 'bg-gray-900 text-white' 
                : 'bg-white text-gray-900 border border-gray-100'
            }`}>
              {m.role === 'user' ? <div className="text-sm font-medium whitespace-pre-wrap">{m.content}</div> : formatContent(m.content)}
              <div className={`text-[9px] mt-3 font-mono opacity-50 ${m.role === 'user' ? 'text-gray-400' : 'text-gray-400'}`}>
                {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-red-700 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-red-700 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-red-700 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        
        {/* Attachment Preview (Multiple Files) */}
        {attachedFiles.length > 0 && (
            <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200">
                {attachedFiles.map((file, idx) => (
                    <div key={idx} className="flex-shrink-0 flex items-center gap-2 bg-gray-50 border border-gray-200 p-2 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                        <div className="p-2 bg-white rounded-lg border border-gray-100 text-red-700">
                            {file.type.includes('image') ? <ImageIcon size={14} /> : <FileText size={14} />}
                        </div>
                        <div className="pr-1">
                            <p className="text-[10px] font-bold text-gray-900 truncate max-w-[100px]">{file.name}</p>
                        </div>
                        <button 
                            onClick={() => removeFile(idx)}
                            className="p-1 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}
                <div className="flex-shrink-0 flex items-center px-2">
                    <span className="text-[9px] font-black uppercase text-gray-300 tracking-widest">{attachedFiles.length} Archivos</span>
                </div>
            </div>
        )}
        
        {/* Main Input Form - Aligned Heights */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex items-end gap-2">
           <input 
             type="file" 
             ref={fileInputRef}
             className="hidden" 
             multiple 
             accept="image/*,application/pdf,text/plain"
             onChange={(e) => handleFileProcess(e.target.files, false)}
           />
           
           {/* Botón Adjuntar */}
           <button
             type="button"
             onClick={() => fileInputRef.current?.click()}
             className="w-[50px] h-[50px] bg-white hover:bg-gray-50 border border-gray-200 text-gray-400 hover:text-red-700 rounded-xl flex items-center justify-center transition-all shadow-sm flex-shrink-0 relative group"
             title="Adjuntar Pruebas (Múltiples archivos)"
           >
             {attachedFiles.length > 0 ? (
                <>
                    <Layers size={20} className="text-red-700" />
                    <span className="absolute -top-1 -right-1 bg-gray-900 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                        {attachedFiles.length}
                    </span>
                </>
             ) : (
                <Paperclip size={20} />
             )}
           </button>

           {/* Caja de Texto con Herramientas IA integradas */}
           <div className="flex-1 relative bg-gray-50 border border-gray-200 rounded-2xl flex items-center transition-all focus-within:ring-2 focus-within:ring-red-700 focus-within:border-transparent focus-within:bg-white">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    disabled={isLoading}
                    placeholder={attachedFiles.length > 0 ? `Describe estos ${attachedFiles.length} documentos al tribunal...` : "Argumenta aquí..."}
                    className="w-full bg-transparent border-none focus:ring-0 outline-none placeholder:text-gray-400 text-sm py-3 pl-4 pr-32 resize-none font-medium custom-scrollbar h-[50px] min-h-[50px] max-h-[120px] leading-relaxed"
                    style={{ height: input.length > 50 ? 'auto' : '50px' }}
                />
                
                {/* AI Helper Tools inside Input */}
                <div className="absolute right-2 flex items-center gap-1">
                     {/* Hada Button (Inside Input) */}
                     <button
                        type="button"
                        onClick={() => handleSend("🧚 Dame un consejo estratégico, Hada Consejera.")}
                        disabled={isLoading}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-30"
                        title="Consejo del Hada"
                     >
                        <Sparkles size={16} />
                     </button>

                     {/* Diablillo Button (Inside Input) */}
                     <button
                        type="button"
                        onClick={() => handleSend("😈 Dame una idea audaz y arriesgada, Diablillo Ingenioso.")}
                        disabled={isLoading}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-30"
                        title="Idea del Diablillo"
                     >
                        <Flame size={16} />
                     </button>
                     
                     <div className="w-px h-4 bg-gray-200 mx-1"></div>

                     {/* Suggestion & Rewrite Buttons */}
                     <button
                        type="button"
                        onClick={handleSuggestion}
                        disabled={isRefining || isLoading}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 transition-colors disabled:opacity-30"
                        title="Sugerir Movimiento (IA)"
                     >
                        {isRefining ? <Loader2 size={14} className="animate-spin" /> : <Lightbulb size={16} />}
                     </button>
                     <button
                        type="button"
                        onClick={handleRewrite}
                        disabled={isRefining || isLoading || !input.trim()}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-30"
                        title="Reescribir en Términos Legales"
                     >
                        <BrainCircuit size={16} />
                     </button>
                </div>
           </div>

           {/* Botón Enviar */}
           <button
            type="submit"
            disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
            className="w-[50px] h-[50px] bg-gray-900 hover:bg-black disabled:bg-gray-200 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg flex-shrink-0"
           >
            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Send size={20} />}
           </button>
        </form>
      </div>
    </div>
  );
};

export default LegalSimulation;
