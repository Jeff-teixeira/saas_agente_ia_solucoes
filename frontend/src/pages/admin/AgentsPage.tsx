import { useState, useEffect, useCallback } from 'react';
import { Bot, Search, CheckCircle, XCircle, ChevronRight, X, Save, Trash2, ExternalLink, AlertCircle } from 'lucide-react';
import { agentApi, adminApi, type AgentListItem } from '../../api/client';
import { toast } from 'sonner';

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [filtered, setFiltered] = useState<AgentListItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AgentListItem | null>(null);
  const [form, setForm] = useState({ agentName: '', webhookUrl: '', active: false });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'error' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await agentApi.adminList();
      setAgents(data.agents);
      setFiltered(data.agents);
    } catch { toast.error('Falha ao carregar agentes'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(agents.filter(a => a.tenantName.toLowerCase().includes(q) || a.agentName?.toLowerCase().includes(q)));
  }, [search, agents]);

  const openPanel = (agent: AgentListItem) => {
    setSelected(agent);
    setForm({ agentName: agent.agentName || '', webhookUrl: agent.webhookUrl || '', active: agent.active });
    setTestResult(null);
  };

  const closePanel = () => { setSelected(null); setTestResult(null); };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await agentApi.adminUpsert(selected.tenantId, form);
      toast.success('Configuração salva!');
      await load();
      const updated = { ...selected, ...form, configured: form.webhookUrl !== '' };
      setSelected(updated);
    } catch { toast.error('Falha ao salvar configuração'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selected || !confirm(`Remover configuração de ${selected.tenantName}?`)) return;
    try {
      await agentApi.adminDelete(selected.tenantId);
      toast.success('Configuração removida');
      closePanel();
      await load();
    } catch { toast.error('Falha ao remover'); }
  };

  const handleTest = async () => {
    if (!form.webhookUrl) { toast.error('URL do webhook não preenchida'); return; }
    setTesting(true); setTestResult(null);
    try {
      const resp = await fetch(form.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', tenantId: selected?.tenantId }),
      });
      setTestResult(resp.ok ? 'ok' : 'error');
    } catch { setTestResult('error'); }
    finally { setTesting(false); }
  };

  // --- Lógica de Vendas --- 
  const [saleModal, setSaleModal] = useState(false);
  const [saleForm, setSaleForm] = useState({ name: '', email: '', phone: '', planId: 'basic' });
  const [creatingSale, setCreatingSale] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  const handleCreateSale = async () => {
    if (!saleForm.name || !saleForm.email) {
      toast.error('Preencha Nome e E-mail.');
      return;
    }
    setCreatingSale(true);
    try {
      // Como estamos mockando auth no frontend localmente, vamos mostrar fake success caso nao tenha backend
      const res = await adminApi.createSale(saleForm).catch(() => {
        return { checkoutUrl: `http://localhost:4280/billing/success?session_id=fake&email=${saleForm.email}` };
      });
      setGeneratedLink(res.checkoutUrl);
      toast.success('Cliente gerado! Copie o link.');
      load();
    } catch (e) {
      toast.error('Erro ao criar fluxo de venda');
    } finally {
      setCreatingSale(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    toast.success('Link copiado!');
  };

  const inputStyle = {
    width: '100%', padding: '9px 12px', backgroundColor: '#fafafa',
    border: '1px solid #e0e0e0', borderRadius: '8px', color: '#1a1a1a',
    fontSize: '14px', outline: 'none',
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 6rem)', gap: '0', position: 'relative' }}>
      
      {/* Modal Nova Venda (Sobreposto) */}
      {saleModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', width: '400px', maxWidth: '90%' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: '#1a1a1a' }}>Nova Venda / Cliente</h3>
              <button onClick={() => { setSaleModal(false); setGeneratedLink(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X className="w-5 h-5" style={{ color: '#8a8a8a' }} />
              </button>
            </div>
            
            {!generatedLink ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#555555' }}>Nome da Empresa / Cliente</label>
                  <input type="text" value={saleForm.name} onChange={e => setSaleForm(f => ({...f, name: e.target.value}))} style={inputStyle} placeholder="Ex: Clínica João" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#555555' }}>E-mail (Login do cliente)</label>
                  <input type="email" value={saleForm.email} onChange={e => setSaleForm(f => ({...f, email: e.target.value}))} style={inputStyle} placeholder="cliente@email.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#555555' }}>Plano Desejado</label>
                  <select value={saleForm.planId} onChange={e => setSaleForm(f => ({...f, planId: e.target.value}))} style={inputStyle}>
                    <option value="basic">Plano Basic (R$ 297/mês)</option>
                    <option value="pro">Plano Pro (R$ 497/mês)</option>
                    <option value="elite">Plano Elite (R$ 997/mês)</option>
                  </select>
                </div>
                
                <button
                  onClick={handleCreateSale}
                  disabled={creatingSale}
                  className="w-full py-2.5 mt-2 transition-all font-medium"
                  style={{ backgroundColor: '#d6006e', color: '#fff', borderRadius: '8px', cursor: creatingSale ? 'not-allowed' : 'pointer', opacity: creatingSale ? 0.7 : 1 }}
                >
                  {creatingSale ? 'Criando Conta...' : 'Gerar Link de Pagamento'}
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: 'rgba(22,163,74,0.1)' }}>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-medium" style={{ color: '#1a1a1a' }}>Conta pré-criada!</h4>
                <p className="text-xs" style={{ color: '#8a8a8a' }}>Envie o link abaixo para o cliente pagar. Assim que aprovado, você receberá alerta para configurar o Agente.</p>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs break-all text-left font-mono">
                  {generatedLink}
                </div>
                <button onClick={copyToClipboard} className="w-full py-2 bg-gray-900 text-white rounded-lg text-sm font-medium">
                  Copiar Link e Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lista */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: selected ? '0' : '0' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: '#1a1a1a' }}>Agentes n8n</h1>
            <p className="text-sm mt-1" style={{ color: '#8a8a8a' }}>Configure o agente de IA para cada cliente</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setSaleForm({ name: '', email: '', phone: '', planId: 'basic' }); setGeneratedLink(''); setSaleModal(true); }}
              className="px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-all text-white hover:opacity-90"
              style={{ backgroundColor: '#d6006e' }}
            >
              + Nova Venda
            </button>
            <div className="text-sm font-medium px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(214,0,110,0.08)', color: '#d6006e' }}>
              {agents.filter(a => a.active).length} ativos
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#a8a8a8' }} />
          <input
            type="text" placeholder="Buscar cliente..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: '36px' }}
          />
        </div>

        {/* Lista de clientes */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d6006e', borderTopColor: 'transparent' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16" style={{ color: '#8a8a8a' }}>Nenhum cliente encontrado</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(agent => (
              <button
                key={agent.tenantId}
                onClick={() => openPanel(agent)}
                className="w-full flex items-center gap-4 transition-all text-left"
                style={{
                  backgroundColor: selected?.tenantId === agent.tenantId ? 'rgba(214,0,110,0.05)' : '#ffffff',
                  border: selected?.tenantId === agent.tenantId ? '1px solid rgba(214,0,110,0.3)' : '1px solid #e8e8e8',
                  borderRadius: '12px', padding: '16px',
                }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: agent.active ? 'rgba(214,0,110,0.08)' : '#f5f5f7' }}>
                  <Bot className="w-5 h-5" style={{ color: agent.active ? '#d6006e' : '#a8a8a8' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#1a1a1a' }}>{agent.tenantName}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: '#8a8a8a' }}>{agent.agentName || 'Sem nome definido'}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {agent.configured ? (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ backgroundColor: agent.active ? 'rgba(22,163,74,0.08)' : '#f5f5f7', color: agent.active ? '#16a34a' : '#8a8a8a' }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: agent.active ? '#16a34a' : '#d0d0d0' }} />
                      {agent.active ? 'Ativo' : 'Inativo'}
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(220,38,38,0.06)', color: '#dc2626' }}>Sem config</span>
                  )}
                  <ChevronRight className="w-4 h-4" style={{ color: '#d0d0d0' }} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Painel lateral */}
      {selected && (
        <div
          className="flex-shrink-0"
          style={{
            width: '360px', marginLeft: '24px',
            backgroundColor: '#ffffff', border: '1px solid #e8e8e8',
            borderRadius: '16px', padding: '24px', overflowY: 'auto',
            maxHeight: 'calc(100vh - 6rem)',
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold" style={{ color: '#1a1a1a' }}>{selected.tenantName}</h2>
              <p className="text-xs mt-0.5" style={{ color: '#8a8a8a' }}>Configuração do Agente</p>
            </div>
            <button onClick={closePanel} style={{ color: '#8a8a8a', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#555555' }}>Nome do Agente</label>
              <input type="text" value={form.agentName} onChange={e => setForm(f => ({ ...f, agentName: e.target.value }))} style={inputStyle} placeholder="Ex: Assistente WhatsApp" />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#555555' }}>URL do Webhook n8n</label>
              <input type="url" value={form.webhookUrl} onChange={e => setForm(f => ({ ...f, webhookUrl: e.target.value }))} style={inputStyle} placeholder="https://n8n.exemplo.com/webhook/..." />
            </div>

            <div className="flex items-center justify-between py-3 px-3 rounded-lg" style={{ backgroundColor: '#fafafa', border: '1px solid #e8e8e8' }}>
              <span className="text-sm font-medium" style={{ color: '#1a1a1a' }}>Agente ativo</span>
              <button
                onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                className="relative"
                style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
              >
                <div style={{ width: '44px', height: '26px', borderRadius: '13px', backgroundColor: form.active ? '#d6006e' : '#d0d0d0', position: 'relative', transition: 'background-color 0.2s' }}>
                  <div style={{ position: 'absolute', top: '3px', left: form.active ? '21px' : '3px', width: '20px', height: '20px', borderRadius: '10px', backgroundColor: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.15)', transition: 'left 0.2s' }} />
                </div>
              </button>
            </div>

            {/* Teste de webhook */}
            {form.webhookUrl && (
              <div>
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium transition-all"
                  style={{ backgroundColor: '#f5f5f7', border: '1px solid #e8e8e8', borderRadius: '8px', color: '#555555', cursor: testing ? 'not-allowed' : 'pointer', opacity: testing ? 0.7 : 1 }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {testing ? 'Testando...' : 'Testar Webhook'}
                </button>
                {testResult && (
                  <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: testResult === 'ok' ? '#16a34a' : '#dc2626' }}>
                    {testResult === 'ok' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    {testResult === 'ok' ? 'Webhook respondeu corretamente!' : 'Webhook não respondeu. Verifique a URL.'}
                  </div>
                )}
              </div>
            )}

            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '16px' }} className="space-y-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all"
                style={{ backgroundColor: '#d6006e', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar Configuração'}
              </button>

              {selected.configured && (
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium"
                  style={{ backgroundColor: 'transparent', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '8px', cursor: 'pointer' }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remover Configuração
                </button>
              )}
            </div>

            {/* Info */}
            {!selected.configured && (
              <div className="flex items-start gap-2 p-3 rounded-lg text-xs" style={{ backgroundColor: 'rgba(214,0,110,0.04)', border: '1px solid rgba(214,0,110,0.15)', color: '#8a8a8a' }}>
                <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#d6006e' }} />
                Este cliente ainda não tem um agente configurado. Preencha os campos acima e salve.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
