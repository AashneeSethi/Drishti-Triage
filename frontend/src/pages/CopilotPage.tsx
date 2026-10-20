import React, { useState } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  User, 
  FileCode, 
  Info
} from 'lucide-react';
import { queryCopilot } from '../services/api';
import type { CopilotResponse } from '../services/api';
import { ForensicStatusBadge } from '../components/ui/Badge';

interface ChatMessage {
  id: string;
  sender: 'INVESTIGATOR' | 'COPILOT';
  text: string;
  timestamp: string;
  citations?: string[];
  claimStatus?: 'VERIFIED' | 'INFERRED' | 'CONTRADICTED' | 'NOT_FOUND';
  disclaimer?: string;
}

const SUGGESTED_PROMPTS = [
  'Who contacted the victim first?',
  'Was the payment before or after the call?',
  'Trace the onward movement of the funds.',
  'कौन सा फोन नंबर सबसे पहले कॉल किया था?'
];

let msgIdCounter = 1;

function getCurrentTimeStr(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-0',
    sender: 'COPILOT',
    text: 'DRISHTI TRIAGE Offline Forensic Co-Investigator initialized. I am running in deterministic air-gapped mode against the active case DT-2026-001 (Operation Digital Arrest). Every answer provided is verified against sealed byte records before presentation.',
    timestamp: '14:00',
    citations: ['calls_cdr.csv', 'bank_upi_statement.csv', 'whatsapp_chat.txt', 'security_events.json'],
    claimStatus: 'VERIFIED',
    disclaimer: 'Deterministic local verifier active. Zero cloud telemetry.'
  }
];

export const CopilotPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const timeStr = getCurrentTimeStr();
    const userMsg: ChatMessage = {
      id: `msg-${msgIdCounter++}`,
      sender: 'INVESTIGATOR',
      text,
      timestamp: timeStr
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response: CopilotResponse = await queryCopilot(text);
      const botMsg: ChatMessage = {
        id: `msg-${msgIdCounter++}`,
        sender: 'COPILOT',
        text: response.answer,
        timestamp: getCurrentTimeStr(),
        citations: response.sourceCitations,
        claimStatus: response.claimStatus,
        disclaimer: response.disclaimer
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `msg-${msgIdCounter++}`,
        sender: 'COPILOT',
        text: 'Local verifier query failed. Please verify that the case evidence vault is sealed.',
        timestamp: getCurrentTimeStr()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e293b] flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            <Bot className="w-5 h-5 text-sky-400" />
            AI Forensic Co-Investigator
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Grounded Forensic Query Assistant &bull; Structured Claims Verified Before Presentation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-sky-950/40 text-sky-300 border border-sky-800/40">
            LOCAL ENGINE SIMULATION (OLLAMA COMPATIBLE)
          </span>
        </div>
      </div>

      {/* Honest Mode Banner */}
      <div className="p-3 rounded-lg bg-[#111827] border border-[#1e293b] text-xs text-slate-300 flex items-center gap-2 flex-shrink-0">
        <Info className="w-4 h-4 text-sky-400 flex-shrink-0" />
        <span>
          <strong>Air-Gapped Sovereign AI:</strong> Responses are grounded in local records. If local Ollama daemon is offline, queries are answered by the deterministic forensic rules engine without leaking queries to third-party clouds.
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-[#080c14] border border-[#1e293b] rounded-lg">
        {messages.map((m) => {
          const isUser = m.sender === 'INVESTIGATOR';
          return (
            <div
              key={m.id}
              className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                isUser ? 'bg-sky-600 text-white' : 'bg-[#182238] border border-[#26344d] text-sky-400'
              }`}>
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className={`p-4 rounded-lg space-y-2.5 text-xs ${
                isUser 
                  ? 'bg-sky-950/50 text-slate-100 border border-sky-800/50' 
                  : 'bg-[#111827] text-slate-200 border border-[#1e293b]'
              }`}>
                <div className="flex items-center justify-between gap-4 text-[10px] text-slate-400 font-mono pb-1 border-b border-[#1e293b]/60">
                  <span className="font-semibold text-slate-300">{isUser ? 'INVESTIGATING OFFICER' : 'DRISHTI COPILOT'}</span>
                  <span>{m.timestamp}</span>
                </div>

                <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>

                {/* Status and Citations for Assistant */}
                {!isUser && m.claimStatus && (
                  <div className="pt-2 border-t border-[#1e293b]/60 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <ForensicStatusBadge status={m.claimStatus} size="sm" />
                      {m.disclaimer && (
                        <span className="text-[10px] text-slate-400 font-mono italic">
                          {m.disclaimer}
                        </span>
                      )}
                    </div>
                    {m.citations && m.citations.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-400">
                        <FileCode className="w-3 h-3 text-sky-400" />
                        <span>Records:</span>
                        {m.citations.map((c) => (
                          <span key={c} className="px-1.5 py-0.5 rounded bg-[#182238] text-slate-300 border border-[#243048]">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs font-mono text-sky-400 p-2">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>Verifying answer against ground-truth evidence vault...</span>
          </div>
        )}
      </div>

      {/* Suggested Prompts Strip */}
      <div className="flex flex-wrap items-center gap-2 pt-1 flex-shrink-0">
        <span className="text-[10px] font-mono uppercase text-slate-500">Quick queries:</span>
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => handleSendMessage(prompt)}
            className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#111827] hover:bg-[#182238] border border-[#1e293b] text-slate-300 hover:text-slate-100 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="flex gap-2 flex-shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendMessage();
          }}
          placeholder="Ask a question about callers, UPI transactions, or device timeline..."
          className="flex-1 bg-[#111827] border border-[#1e293b] rounded-md px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-sky-500"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={isLoading || !inputText.trim()}
          className="px-4 py-2.5 rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-mono text-xs font-semibold flex items-center gap-2"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask Copilot</span>
        </button>
      </div>
    </div>
  );
};
