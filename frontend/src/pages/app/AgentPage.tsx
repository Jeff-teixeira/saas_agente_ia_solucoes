import { useState, useEffect, useCallback } from 'react';
import { Bot, CheckCircle, Clock, AlertCircle, Zap } from 'lucide-react';
import { agentApi } from '../../api/client';

export default function AgentPage() {
  const [agent, setAgent] = useState<{
    agentName: string; active: boolean; configured: boolean; updatedAt?: string;
  } | null>(null);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await agentApi.getConfig();
      setAgent(data);
    } catch { setAgent(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async () => {
    if (!agent?.configured) return;
    setToggling(true); setError('');
    try {
      const res = await agentApi.toggle(!agent.active);
      setAgent(prev => prev ? { ...prev, active: res.active, updatedAt: res.updatedAt } : prev);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Falha ao comunicar com o agente.');
    } finally { setToggling(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d6006e', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const isActive = agent?.active ?? false;
  const isConfigured = agent?.configured ?? false;
  const agentName = agent?.agentName || 'Agente IA';

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#1a1a1a' }}>Meu Agente</h1>
        <p className="mt-1 text-sm" style={{ color: '#8a8a8a' }}>Controle o seu assistente de IA no WhatsApp</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-6 px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626' }}>
          <AlertCircle className="w-4 h-4" />{error}
        </div>
      )}

      {/* Status Card Principal */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e8e8e8', borderRadius: '20px', padding: '36px', textAlign: 'center', marginBottom: '16px' }}>
        {/* Ícone animado */}
        <div className="mx-auto mb-6 relative" style={{ width: '80px', height: '80px' }}>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              backgroundColor: isActive ? 'rgba(214,0,110,0.1)' : '#f5f5f7',
              transition: 'background-color 0.4s ease',
            }}
          />
          {isActive && (
            <div
              className="absolute inset-0 rounded-full animate-ping"
              style={{ backgroundColor: 'rgba(214,0,110,0.15)' }}
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <Bot className="w-9 h-9" style={{ color: isActive ? '#d6006e' : '#a8a8a8', transition: 'color 0.4s ease' }} />
          </div>
        </div>

        <h2 className="text-2xl font-semibold mb-2" style={{ color: '#1a1a1a' }}>{agentName}</h2>

        {/* Status pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6" style={{
          backgroundColor: isActive ? 'rgba(22,163,74,0.08)' : '#f5f5f7',
        }}>
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isActive ? '#16a34a' : '#d0d0d0' }} />
          <span className="text-sm font-medium" style={{ color: isActive ? '#16a34a' : '#8a8a8a' }}>
            {isActive ? 'Ativo e atendendo' : 'Pausado'}
          </span>
        </div>

        {/* Botão grande de toggle */}
        {isConfigured ? (
          <button
            onClick={handleToggle}
            disabled={toggling}
            className="w-full py-3.5 text-base font-medium transition-all duration-200"
            style={{
              backgroundColor: isActive ? '#f5f5f7' : '#d6006e',
              color: isActive ? '#555555' : '#ffffff',
              border: isActive ? '1px solid #e8e8e8' : 'none',
              borderRadius: '12px',
              cursor: toggling ? 'not-allowed' : 'pointer',
              opacity: toggling ? 0.7 : 1,
            }}
          >
            {toggling ? 'Aguardando...' : isActive ? '⏸ Pausar Agente' : '▶ Ativar Agente'}
          </button>
        ) : (
          <div className="py-3 text-sm text-center" style={{ color: '#8a8a8a', backgroundColor: '#f5f5f7', borderRadius: '12px' }}>
            Agente não configurado — contate o suporte
          </div>
        )}
      </div>

      {/* Info cards */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 px-4 py-3.5" style={{ backgroundColor: '#ffffff', border: '1px solid #e8e8e8', borderRadius: '12px' }}>
          <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: isConfigured ? '#16a34a' : '#d0d0d0' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>Configuração</p>
            <p className="text-xs mt-0.5" style={{ color: '#8a8a8a' }}>{isConfigured ? 'Webhook n8n configurado' : 'Aguardando configuração'}</p>
          </div>
        </div>

        {agent?.updatedAt && (
          <div className="flex items-center gap-3 px-4 py-3.5" style={{ backgroundColor: '#ffffff', border: '1px solid #e8e8e8', borderRadius: '12px' }}>
            <Clock className="w-4 h-4 flex-shrink-0" style={{ color: '#8a8a8a' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>Última atualização</p>
              <p className="text-xs mt-0.5" style={{ color: '#8a8a8a' }}>{new Date(agent.updatedAt).toLocaleString('pt-BR')}</p>
            </div>
          </div>
        )}

        {isActive && (
          <div className="flex items-center gap-3 px-4 py-3.5" style={{ backgroundColor: 'rgba(214,0,110,0.04)', border: '1px solid rgba(214,0,110,0.15)', borderRadius: '12px' }}>
            <Zap className="w-4 h-4 flex-shrink-0" style={{ color: '#d6006e' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: '#d6006e' }}>Em operação</p>
              <p className="text-xs mt-0.5" style={{ color: '#8a8a8a' }}>Seu agente está respondendo clientes agora</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
