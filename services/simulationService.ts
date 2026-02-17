
import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `
# SISTEMA DE SIMULACIÓN JUDICIAL INTERACTIVA

Eres un sofisticado simulador de juicios que crea experiencias jurídicas inmersivas y educativas. Tu función es dirigir simulaciones judiciales completas donde el usuario asume un rol y las IA generan personalidades diferenciadas para los demás participantes.

## MODOS DE OPERACIÓN
1. **MODO MENÚ (Default):** Si el usuario solo saluda, presenta el menú de selección de roles y casos.
2. **MODO DIRECTO (Prioridad):** Si el usuario envía una configuración inicial (ROL y CASO), OMITIR menús y comenzar inmediatamente la FASE 4 (Simulación Interactiva).

## FASE 4: SIMULACIÓN INTERACTIVA (Estructura de Turnos)
En cada turno presenta:
═══════════════════════════════════════════════
📊 DASHBOARD DE RENDIMIENTO
🎯 Fase: [Fase actual] | Turno: [X/Y]
┌─ MÉTRICAS DE DESEMPEÑO ─────────────────────┐
│ 💬 Calidad Argumental: [Barra ASCII] % │
│ 📈 Probabilidad de Éxito: [Barra ASCII] % │
│ ⚡ Impacto Emocional: [Barra ASCII] % │
│ 📚 Solidez Jurídica: [Barra ASCII] % │
│ 🎭 Credibilidad: [Barra ASCII] % │
└──────────────────────────────────────────────┘
🔍 Factores que afectan tu posición:
[Factores breves]
═══════════════════════════════════════════════
🎬 DESARROLLO DEL JUICIO:
[Narración de la acción actual]
[Intervención del personaje IA correspondiente con su estilo único]
─────────────────────────────────────────────
💭 Tu turno: [Instrucción específica según fase]
🧚 HADA CONSEJERA disponible (escribe 'consejo')
😈 DIABLILLO INGENIOSO disponible (escribe 'idea')
📎 Si has subido un documento, menciónalo para que sea analizado.

### Sistema de Puntuación:
Evalúa: Relevancia jurídica, Persuasión, Uso de evidencias, Manejo de objeciones, Credibilidad.

## ASISTENTES ESPECIALES
### 🧚 HADA CONSEJERA
Si el usuario pide consejo: Análisis sereno, ético, fundamentado.
### 😈 DIABLILLO INGENIOSO
Si el usuario pide idea audaz: Tácticas poco convencionales, presión psicológica, alto riesgo.

## REGLAS CRÍTICAS
- Si recibes "CONFIG_INICIAL: ROL=[X], CASO=[Y]", inicia INMEDIATAMENTE la narrativa del juicio asumiendo que el usuario es [X] en el caso [Y].
- Mantén consistencia de carácter en IAs.
- Realismo jurídico.
`;

export interface Attachment {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

export interface DashboardMetrics {
  argumentStrength: number; // 0-100
  sentimentScore: number; // -100 to 100
  successProbability: number; // 0-100
  sentimentLabel: string; // "Hostil", "Neutral", "Favorable"
}

export class SimulationService {
  private chat: any;
  private apiKey: string;
  private aiClient: GoogleGenAI;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.aiClient = new GoogleGenAI({ apiKey: this.apiKey });
    this.initChat();
  }

  private initChat() {
    this.chat = this.aiClient.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });
  }

  async sendMessage(message: string, attachments: Attachment[] = []): Promise<string> {
    try {
      if (!this.chat) this.initChat();
      
      let payload;
      
      if (attachments && attachments.length > 0) {
        // When attachments exist, we must send an array of Parts wrapped in the 'message' property.
        // It cannot be passed as the root object.
        const parts = [
            { text: message },
            ...attachments
        ];
        payload = { message: parts };
      } else {
        payload = { message };
      }
      
      const result = await this.chat.sendMessage(payload);
      return result.text;
    } catch (error) {
      console.error("Simulation Error:", error);
      throw error;
    }
  }

  async startSimulation(): Promise<string> {
    // Legacy start
    try {
      if (!this.chat) this.initChat();
      const result = await this.chat.sendMessage({ message: "Hola, inicia el menú." });
      return result.text;
    } catch (error) {
        return "Error al iniciar.";
    }
  }

  async startCustomSimulation(role: string, caseDetails: string, attachments: Attachment[] = []): Promise<string> {
    try {
        if (!this.chat) this.initChat();
        
        const prompt = `CONFIG_INICIAL: ROL=${role}, CASO=${caseDetails}.
        
        Instrucciones:
        1. NO muestres ningún menú.
        2. Configura el entorno judicial inmediatamente.
        3. Presenta el caso y da la palabra inicial al usuario (o al juez si el usuario no es el juez).
        4. Si hay documentos adjuntos, analízalos como EVIDENCIA INICIAL del caso.`;

        let payload;
        if (attachments.length > 0) {
            const parts = [{ text: prompt }, ...attachments];
            payload = { message: parts };
        } else {
            payload = { message: prompt };
        }

        const result = await this.chat.sendMessage(payload);
        return result.text;
    } catch (error) {
        console.error("Custom Start Error:", error);
        throw error;
    }
  }

  // --- NUEVAS FUNCIONES DE ASISTENCIA ---

  async refineArgument(text: string): Promise<string> {
    try {
      const prompt = `Actúa como un redactor jurídico experto. Reescribe el siguiente texto para que suene profesional, use terminología legal precisa y tenga un tono contundente propio de un juicio, manteniendo el significado original. Solo devuelve el texto reescrito, sin explicaciones. Texto: "${text}"`;
      
      const response = await this.aiClient.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      return response.text?.trim() || text;
    } catch (e) {
      console.error("Refine Error:", e);
      return text;
    }
  }

  async getStrategicSuggestion(lastMessages: string): Promise<string> {
    try {
      const prompt = `Basado en el siguiente contexto breve de un juicio simulado, sugiere UNA ÚNICA frase corta y contundente que el usuario (jugador) podría decir a continuación para ganar ventaja. Contexto reciente: ${lastMessages.slice(-1000)}. Sugerencia:`;
      
      const response = await this.aiClient.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      return response.text?.replace(/"/g, '').trim() || "Protesto, Señoría.";
    } catch (e) {
      return "Solicito un receso para revisar las pruebas.";
    }
  }

  async getDashboardMetrics(history: string): Promise<DashboardMetrics> {
    try {
      const prompt = `
        Analiza el historial de esta simulación judicial.
        Devuelve SOLO un objeto JSON con estas 4 claves exactas (sin markdown, sin explicaciones):
        {
          "argumentStrength": (número 0-100 evaluando la calidad de los argumentos del usuario),
          "sentimentScore": (número -100 a 100, donde negativo es hostil y positivo es favorable hacia el usuario),
          "successProbability": (número 0-100 estimando la probabilidad actual de ganar el caso),
          "sentimentLabel": (string corto: "Hostil", "Tenso", "Neutral", "Receptivo", "Favorable")
        }
        Historial reciente: ${history.slice(-3000)}
      `;

      const response = await this.aiClient.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      
      const text = response.text || "{}";
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      return {
        argumentStrength: 50,
        sentimentScore: 0,
        successProbability: 50,
        sentimentLabel: "Neutral"
      };
    }
  }
}
