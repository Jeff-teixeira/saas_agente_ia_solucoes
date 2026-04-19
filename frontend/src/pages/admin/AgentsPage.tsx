import { useState, useEffect, useCallback } from 'react';
import { Bot, Search, CheckCircle, XCircle, ChevronRight, X, Save, Trash2, ExternalLink, AlertCircle, ShoppingCart, Copy } from 'lucide-react';
import { agentApi, adminApi, type AgentListItem } from '../../api/client';
import { toast } from 'sonner';

export default function AdminAgentsPage() {
  const [activeTab, setActiveTab] = useState<'agents' | 'sales'>('sales');
  
  // --- Agents State ---
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<AgentListItem[]>([]);
  const [searchAgents, setSearchAgents] = useState('');
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentListItem | null>(null);
  const [agentForm, setAgentForm] = useState({ agentName: '', webhookUrl: '', active: false });
  const [savingAgent, setSavingAgent] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'error' | null>(null);

  // --- Sales State ---
  const [sales, setSales] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);
  
  const [saleModal, setSaleModal] = useState(false);
  const [saleForm, setSaleForm] = useState({ name: '', email: '', phone: '', planId: 'basic' });
  const [creatingSale, setCreatingSale] = useState(false);
  const [generatedSale, setGeneratedSale] = useState<any>(null);

  // --- Loading ---
  const loadAgents = useCallback(async () => {
    setLoadingAgents(true);
    try {
      const data = await agentApi.adminList();
      setAgents(data.agents);
      setFilteredAgents(data.agents);
    } catch { toast.error('Falha ao carregar agentes'); }
    finally { setLoadingAgents(false); }
  }, []);

  const loadSales = useCallback(async () => {
    setLoadingSales(true);
    try {
      const data = await adminApi.listSales();
      setSales(data.orders || []);
    } catch { toast.error('Falha ao carregar vendas'); }
    finally { setLoadingSales(false); }
  }, []);

  useEffect(() => { 
    if (activeTab === 'agents') loadAgents(); 
    else loadSales();
  }, [activeTab, loadAgents, loadSales]);

  useEffect(() => {
    const q = searchAgents.toLowerCase();
    setFilteredAgents(agents.filter(a => a.tenantName.toLowerCase().includes(q) || a.agentName?.toLowerCase().includes(q)));
  }, [searchAgents, agents]);

  // --- Agent Handlers ---
  const openAgentPanel = (agent: AgentListItem) => {
    setSelectedAgent(agent);
    setAgentForm({ agentName: agent.agentName || '', webhookUrl: agent.webhookUrl || '', active: agent.active });
    setTestResult(null);
  };
  const closeAgentPanel = () => { setSelectedAgent(null); setTestResult(null); };

  const handleSaveAgent = async () => {
    if (!selectedAgent) return;
    setSavingAgent(true);
    try {
      await agentApi.adminUpsert(selectedAgent.tenantId, agentForm);
      toast.success('Configuração salva!');
      await loadAgents();
      const updated = { ...selectedAgent, ...agentForm, configured: agentForm.webhookUrl !== '' };
      setSelectedAgent(updated);
    } catch { toast.error('Falha ao salvar configuração'); }
    finally { setSavingAgent(false); }
  };

  const handleDeleteAgent = async () => {
    if (!selectedAgent || !confirm(`Remover configuração de ${selectedAgent.tenantName}?`)) return;
    try {
      await agentApi.adminDelete(selectedAgent.tenantId);
      toast.success('Configuração removida');
      closeAgentPanel();
      await loadAgents();
    } catch { toast.error('Falha ao remover'); }
  };

  const handleTestWebhook = async () => {
    if (!agentForm.webhookUrl) { toast.error('URL do webhook não preenchida'); return; }
    setTestingWebhook(true); setTestResult(null);
    try {
      const resp = await fetch(agentForm.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', tenantId: selectedAgent?.tenantId }),
      });
      setTestResult(resp.ok ? 'ok' : 'error');
    } catch { setTestResult('error'); }
    finally { setTestingWebhook(false); }
  };

  // --- Sales Handlers ---
  const handleCreateSale = async () => {
    if (!saleForm.name || !saleForm.email) {
      toast.error('Preencha Nome e E-mail.');
      return;
    }
    setCreatingSale(true);
    try {
      const res = await adminApi.createSale(saleForm);
      setGeneratedSale(res);
      toast.success('Cliente gerado! Copie os links.');
      loadSales();
    } catch (e) {
      toast.error('Erro ao criar venda');
    } finally {
      setCreatingSale(false);
    }
  };

  const copyLink = (link: string, name: string) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    toast.success(`Link de ${name} copiado!`);
  };

  const inputStyle = {
    width: '100%', padding: '9px 12px', backgroundColor: '#fafafa',
    border: '1px solid #e0e0e0', borderRadius: '8px', color: '#1a1a1a',
    fontSize: '14px', outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 6rem)', gap: '0', position: 'relative' }}>
      
      {/* Modal Nova Venda (Sobreposto) */}
      {saleModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', width: '450px', maxWidth: '90%' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: '#1a1a1a' }}>Nova Venda / Setup</h3>
              <button onClick={() => { setSaleModal(false); setGeneratedSale(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X className="w-5 h-5" style={{ color: '#8a8a8a' }} />
              </button>
            </div>
            
            {!generatedSale ? (
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
                  <label className="block text-xs font-medium mb-1" style={{ color: '#555555' }}>Telefone do Cliente</label>
                  <input type="tel" value={saleForm.phone} onChange={e => setSaleForm(f => ({...f, phone: e.target.value}))} style={inputStyle} placeholder="11999999999" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#555555' }}>Plano Desejado</label>
                  <select value={saleForm.planId} onChange={e => setSaleForm(f => ({...f, planId: e.target.value}))} style={inputStyle}>
                    <option value="starter">Starter (Setup R$ 1.500 / Mês R$ 297)</option>
                    <option value="pro">Pro (Setup R$ 2.500 / Mês R$ 497)</option>
                    <option value="elite">Elite (Setup R$ 3.500 / Mês R$ 997)</option>
                  </select>
                </div>
                
                <button
                  onClick={handleCreateSale}
                  disabled={creatingSale}
                  className="w-full py-2.5 mt-2 transition-all font-medium"
                  style={{ backgroundColor: '#d6006e', color: '#fff', borderRadius: '8px', cursor: creatingSale ? 'not-allowed' : 'pointer', opacity: creatingSale ? 0.7 : 1 }}
                >
                  {creatingSale ? 'Criando Conta e Asaas...' : 'Gerar Venda Completa'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-2" style={{ backgroundColor: 'rgba(22,163,74,0.1)' }}>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-medium text-center" style={{ color: '#1a1a1a' }}>Venda Cadastrada com Sucesso!</h4>
                
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-3">
                  <div>
                    <p className="text-xs font-bold text-gray-700">1. Cobrança do Setup 💰</p>
                    <p className="text-xs text-gray-500 mb-1">Envie este link para o cliente pagar o setup inicial via Asaas.</p>
                    <div className="flex items-center gap-2">
                       <input type="text" readOnly value={generatedSale.setupPaymentLink} style={{...inputStyle, padding: '6px', fontSize: '12px'}} />
                       <button onClick={() => copyLink(generatedSale.setupPaymentLink, 'Setup')} className="p-2 border border-gray-300 rounded bg-white text-gray-600 hover:bg-gray-50">
                         <Copy className="w-4 h-4"/>
                       </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700">2. Assinatura Mensal 🔄</p>
                    <p className="text-xs text-gray-500 mb-1">Link para iniciar a mensalidade recorrente do Agente.</p>
                    <div className="flex items-center gap-2">
                       <input type="text" readOnly value={generatedSale.subscriptionLink} style={{...inputStyle, padding: '6px', fontSize: '12px'}} />
                       <button onClick={() => copyLink(generatedSale.subscriptionLink, 'Assinatura')} className="p-2 border border-gray-300 rounded bg-white text-gray-600 hover:bg-gray-50">
                         <Copy className="w-4 h-4"/>
                       </button>
                    </div>
                  </div>
                </div>

                <button onClick={() => {setSaleModal(false); setGeneratedSale(null);}} className="w-full py-2 bg-gray-900 text-white rounded-lg text-sm font-medium">
                  Concluir
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header and Tabs */}
      <div className="flex items-end justify-between border-b border-gray-200 pb-0 shrink-0 mb-6 mt-2">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setActiveTab('sales')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'sales' ? 'border-[#d6006e] text-[#d6006e]' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            <ShoppingCart className="w-4 h-4 inline-block mr-2 align-text-bottom" />
            Vendas e Clientes
          </button>
          <button 
            onClick={() => setActiveTab('agents')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'agents' ? 'border-[#d6006e] text-[#d6006e]' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            <Bot className="w-4 h-4 inline-block mr-2 align-text-bottom" />
            Agentes n8n
          </button>
        </div>
        <div className="pb-3 border-b-2 border-transparent">
          <button 
            onClick={() => { setSaleForm({ name: '', email: '', phone: '', planId: 'starter' }); setGeneratedSale(null); setSaleModal(true); }}
            className="px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-all text-white hover:opacity-90 flex items-center gap-2"
            style={{ backgroundColor: '#d6006e' }}
          >
            <ShoppingCart className="w-4 h-4" />
            Nova Venda
          </button>
        </div>
      </div>

      {/* --- TAB: SALES --- */}
      {activeTab === 'sales' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingSales ? (
            <div className="flex items-center justify-center py-16"><div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d6006e' }} /></div>
          ) : sales.length === 0 ? (
            <div className="text-center py-16 text-gray-500">Nenhuma venda encontrada</div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-900 border-b border-gray-200">
                  <tr>
                    <th className="font-medium p-3">Cliente</th>
                    <th className="font-medium p-3">Plano</th>
                    <th className="font-medium p-3">Setup</th>
                    <th className="font-medium p-3">Assinatura Mensal</th>
                    <th className="font-medium p-3">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sales.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold text-gray-900">{s.clientName}</div>
                        <div className="text-xs text-gray-500">{s.email}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-xs border border-gray-200 bg-white font-medium">{s.setupPlanName}</span>
                      </td>
                      <td className="p-3">
                        {s.setupStatus === 'paid' ? (
                          <span className="flex items-center gap-1.5 text-green-700 text-xs font-medium"><CheckCircle className="w-3.5 h-3.5" /> Pago</span>
                        ) : (
                          <div className="flex items-center gap-2">
                             <span className="text-orange-600 text-xs font-medium">Pendente</span>
                             <button onClick={() => copyLink(s.setupPaymentLink, 'Setup')} className="text-xs text-blue-600 underline hover:text-blue-800">Copiar Link</button>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        {s.subscriptionStatus === 'active' ? (
                          <span className="flex items-center gap-1.5 text-green-700 text-xs font-medium"><CheckCircle className="w-3.5 h-3.5" /> Ativo</span>
                        ) : s.subscriptionStatus === 'canceled' ? (
                           <span className="text-red-600 text-xs font-medium">Cancelada</span>
                        ) : (
                          <div className="flex items-center gap-2">
                             <span className="text-orange-600 text-xs font-medium">Pendente</span>
                             <button onClick={() => copyLink(s.subscriptionLink, 'Assinatura')} className="text-xs text-blue-600 underline hover:text-blue-800">Copiar Link</button>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-xs text-gray-500">
                         {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- TAB: AGENTS --- */}
      {activeTab === 'agents' && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: selectedAgent ? '0' : '0' }}>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#a8a8a8' }} />
              <input
                type="text" placeholder="Buscar cliente..." value={searchAgents}
                onChange={e => setSearchAgents(e.target.value)}
                style={{ ...inputStyle, paddingLeft: '36px' }}
              />
            </div>
            {loadingAgents ? (
              <div className="flex items-center justify-center py-16"><div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d6006e' }} /></div>
            ) : filteredAgents.length === 0 ? (
              <div className="text-center py-16 text-gray-500">Nenhum agente encontrado</div>
            ) : (
              <div className="space-y-2 pr-2">
                {filteredAgents.map(agent => (
                  <button
                    key={agent.tenantId}
                    onClick={() => openAgentPanel(agent)}
                    className="w-full flex items-center gap-4 transition-all text-left"
                    style={{
                      backgroundColor: selectedAgent?.tenantId === agent.tenantId ? 'rgba(214,0,110,0.05)' : '#ffffff',
                      border: selectedAgent?.tenantId === agent.tenantId ? '1px solid rgba(214,0,110,0.3)' : '1px solid #e8e8e8',
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

          {/* Painel lateral do Agente */}
          {selectedAgent && (
            <div
              className="flex-shrink-0"
              style={{
                width: '360px', marginLeft: '24px',
                backgroundColor: '#ffffff', border: '1px solid #e8e8e8',
                borderRadius: '16px', padding: '24px', overflowY: 'auto',
                maxHeight: '100%',
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-base font-semibold" style={{ color: '#1a1a1a' }}>{selectedAgent.tenantName}</h2>
                  <p className="text-xs mt-0.5" style={{ color: '#8a8a8a' }}>Configuração do Agente</p>
                </div>
                <button onClick={closeAgentPanel} style={{ color: '#8a8a8a', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#555555' }}>Nome do Agente</label>
                  <input type="text" value={agentForm.agentName} onChange={e => setAgentForm(f => ({ ...f, agentName: e.target.value }))} style={inputStyle} placeholder="Ex: Assistente WhatsApp" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#555555' }}>URL do Webhook n8n</label>
                  <input type="url" value={agentForm.webhookUrl} onChange={e => setAgentForm(f => ({ ...f, webhookUrl: e.target.value }))} style={inputStyle} placeholder="https://n8n.exemplo.com/webhook/..." />
                </div>
                <div className="flex items-center justify-between py-3 px-3 rounded-lg" style={{ backgroundColor: '#fafafa', border: '1px solid #e8e8e8' }}>
                  <span className="text-sm font-medium" style={{ color: '#1a1a1a' }}>Agente ativo</span>
                  <button onClick={() => setAgentForm(f => ({ ...f, active: !f.active }))} style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
                    <div style={{ width: '44px', height: '26px', borderRadius: '13px', backgroundColor: agentForm.active ? '#d6006e' : '#d0d0d0', position: 'relative', transition: 'background-color 0.2s' }}>
                      <div style={{ position: 'absolute', top: '3px', left: agentForm.active ? '21px' : '3px', width: '20px', height: '20px', borderRadius: '10px', backgroundColor: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.15)', transition: 'left 0.2s' }} />
                    </div>
                  </button>
                </div>

                {agentForm.webhookUrl && (
                  <div>
                    <button
                      onClick={handleTestWebhook} disabled={testingWebhook}
                      className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium transition-all"
                      style={{ backgroundColor: '#f5f5f7', border: '1px solid #e8e8e8', borderRadius: '8px', color: '#555555', cursor: testingWebhook ? 'not-allowed' : 'pointer', opacity: testingWebhook ? 0.7 : 1 }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> {testingWebhook ? 'Testando...' : 'Testar Webhook'}
                    </button>
                    {testResult && (
                      <div className={`flex items-center gap-2 mt-2 text-xs ${testResult === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                        {testResult === 'ok' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        {testResult === 'ok' ? 'Webhook respondeu!' : 'Webhook falhou.'}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '16px' }} className="space-y-2">
                  <button onClick={handleSaveAgent} disabled={savingAgent} className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all" style={{ backgroundColor: '#d6006e', color: '#ffffff', borderRadius: '8px', opacity: savingAgent ? 0.7 : 1 }}>
                    <Save className="w-4 h-4" /> {savingAgent ? 'Salvando...' : 'Salvar Configuração'}
                  </button>
                  {selectedAgent.configured && (
                    <button onClick={handleDeleteAgent} className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium bg-transparent text-red-600 border border-red-200 rounded-lg">
                      <Trash2 className="w-3.5 h-3.5" /> Remover Configuração
                    </button>
                  )}
                </div>
                {!selectedAgent.configured && (
                  <div className="flex items-start gap-2 p-3 rounded-lg text-xs" style={{ backgroundColor: 'rgba(214,0,110,0.04)', border: '1px solid rgba(214,0,110,0.15)', color: '#8a8a8a' }}>
                    <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#d6006e' }} /> Preencha para habilitar o n8n deste cliente.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
