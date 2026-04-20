import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bot, Search, CheckCircle, XCircle, X, Save, ExternalLink,
  ShoppingCart, Copy, RefreshCw, Clock, Key, Calendar, Info, Settings,
  Headphones, Users, AlertCircle,
} from 'lucide-react';
import { agentApi, adminApi, type AgentListItem } from '../../api/client';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type MainTab = 'sales' | 'agents' | 'chatup';
type SalesFilter = 'all' | 'active' | 'pending' | 'overdue';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', backgroundColor: '#fafafa',
  border: '1px solid #e0e0e0', borderRadius: '8px', color: '#1a1a1a',
  fontSize: '14px', outline: 'none',
};

const darkInputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', backgroundColor: '#1a1d24',
  border: '1px solid #2d303a', borderRadius: '10px', color: '#fff',
  fontSize: '14px', outline: 'none',
};

function StatusBadge({ status }: { status: string }) {
  if (status === 'paid' || status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-200">
        <CheckCircle className="w-3.5 h-3.5" /> {status === 'paid' ? 'Pago' : 'Ativo'}
      </span>
    );
  }
  if (status === 'overdue' || status === 'canceled') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
        <XCircle className="w-3.5 h-3.5" /> {status === 'overdue' ? 'Vencido' : 'Cancelada'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-semibold border border-orange-200">
      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" /> Aguardando
    </span>
  );
}

function ProductBadges({ sale }: { sale: any }) {
  const products: { label: string; color: string; bg: string; border: string }[] = [];

  // Agente N8N — tem se tem webhook configurado ou setup pago
  if (sale.setupStatus === 'paid' || sale.agentWebhookUrl) {
    products.push({ label: 'Agente N8N', color: '#d6006e', bg: 'rgba(214,0,110,0.08)', border: 'rgba(214,0,110,0.2)' });
  }
  // Chat Up — tem se chatupEnabled = true
  if (sale.chatupEnabled) {
    products.push({ label: 'Chat Up', color: '#6366f1', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)' });
  }

  if (products.length === 0) {
    return <span className="text-xs text-gray-500 italic">{sale.setupPlanName || 'Custom'}</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {products.map(p => (
        <span key={p.label} className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
          style={{ color: p.color, backgroundColor: p.bg, border: `1px solid ${p.border}` }}>
          {p.label}
        </span>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminAgentsPage() {
  const [activeTab, setActiveTab] = useState<MainTab>('sales');
  const [salesFilter, setSalesFilter] = useState<SalesFilter>('all');

  // --- Agents ---
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [searchAgents, setSearchAgents] = useState('');
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [n8nConfigModal, setN8nConfigModal] = useState<AgentListItem | null>(null);
  const [n8nForm, setN8nForm] = useState({ agentName: '', webhookUrl: '' });
  const [savingN8n, setSavingN8n] = useState(false);
  const [testingN8n, setTestingN8n] = useState(false);
  const [testN8nResult, setTestN8nResult] = useState<'ok' | 'error' | null>(null);
  const [n8nToggling, setN8nToggling] = useState<Record<string, boolean>>({});

  // --- Sales ---
  const [sales, setSales] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [saleModal, setSaleModal] = useState(false);
  const [saleForm, setSaleForm] = useState({ name: '', email: '', phone: '', cpfCnpj: '', customSetupPrice: 1500, customMonthlyPrice: 297 });
  const [creatingSale, setCreatingSale] = useState(false);
  const [generatedSale, setGeneratedSale] = useState<any>(null);
  const [saleInfoModal, setSaleInfoModal] = useState<any>(null);

  // --- Chat Up ---
  const [chatupToggling, setChatupToggling] = useState<Record<string, boolean>>({});

  // ─── Loaders ─────────────────────────────────────────────────────────────

  const loadAgents = useCallback(async () => {
    setLoadingAgents(true);
    try {
      const data = await agentApi.adminList();
      setAgents(data.agents);
    } catch { toast.error('Falha ao carregar agentes'); }
    finally { setLoadingAgents(false); }
  }, []);

  const loadSales = useCallback(async (silent = false) => {
    if (!silent) setLoadingSales(true);
    else setIsRefreshing(true);
    try {
      const data = await adminApi.listSales();
      const newSales = data.orders || [];
      setSales(prev => {
        if (silent && prev.length > 0) {
          newSales.forEach((s: any) => {
            const p = prev.find((x: any) => x.id === s.id);
            if (p && p.setupStatus !== 'paid' && s.setupStatus === 'paid') toast.success(`✅ Setup pago! ${s.clientName}`);
            if (p && p.subscriptionStatus !== 'active' && s.subscriptionStatus === 'active') toast.success(`🔄 Assinatura ativada! ${s.clientName}`);
          });
        }
        return newSales;
      });
      setLastRefreshed(new Date());
    } catch { if (!silent) toast.error('Falha ao carregar vendas'); }
    finally { setLoadingSales(false); setIsRefreshing(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'agents') { loadAgents(); loadSales(); if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current); }
    else if (activeTab === 'sales') {
      loadSales();
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = setInterval(() => loadSales(true), 30000);
    } else {
      loadSales();
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    }
    return () => { if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current); };
  }, [activeTab]);

  // ─── Sales Handlers ───────────────────────────────────────────────────────

  const handleCreateSale = async () => {
    if (!saleForm.name || !saleForm.email) { toast.error('Preencha Nome e E-mail.'); return; }
    setCreatingSale(true);
    try {
      const res = await adminApi.createSale(saleForm);
      setGeneratedSale(res);
      toast.success('Cliente gerado com sucesso!');
      if (res.setupPaymentLink) window.open(res.setupPaymentLink, '_blank');
      loadSales();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Erro ao gerar link de venda');
    } finally { setCreatingSale(false); }
  };

  const copyLink = (link: string, name: string) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    toast.success(`Link de ${name} copiado!`);
  };

  // ─── N8N Handlers ─────────────────────────────────────────────────────────

  const openN8nConfig = (agent: AgentListItem) => {
    setN8nForm({ agentName: agent.agentName || '', webhookUrl: agent.webhookUrl || '' });
    setTestN8nResult(null);
    setN8nConfigModal(agent);
  };

  const handleSaveN8n = async () => {
    if (!n8nConfigModal) return;
    setSavingN8n(true);
    try {
      await agentApi.adminUpsert(n8nConfigModal.tenantId, { ...n8nForm, active: true });
      toast.success('Agente N8N configurado e ativado!');
      await loadAgents();
      setN8nConfigModal(null);
    } catch { toast.error('Falha ao salvar configuração N8N'); }
    finally { setSavingN8n(false); }
  };

  const handleTestN8n = async () => {
    if (!n8nForm.webhookUrl) { toast.error('URL do webhook não preenchida'); return; }
    setTestingN8n(true); setTestN8nResult(null);
    try {
      const resp = await fetch(n8nForm.webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'test', tenantId: n8nConfigModal?.tenantId }) });
      setTestN8nResult(resp.ok ? 'ok' : 'error');
      if (resp.ok) toast.success('Webhook respondeu com sucesso!');
      else toast.error('Webhook retornou erro.');
    } catch { setTestN8nResult('error'); toast.error('Falha ao conectar no webhook.'); }
    finally { setTestingN8n(false); }
  };

  const handleN8nToggle = async (agent: AgentListItem, active: boolean) => {
    setN8nToggling(t => ({ ...t, [agent.tenantId]: true }));
    try {
      await agentApi.adminUpsert(agent.tenantId, { agentName: agent.agentName || '', webhookUrl: agent.webhookUrl || '', active });
      toast.success(active ? `✅ Bot ativado: ${agent.tenantName}` : `⏸️ Bot pausado: ${agent.tenantName}`);
      await loadAgents();
    } catch (err: any) {
      toast.error(`Falha ao alterar bot: ${err?.response?.data?.error || err?.message}`);
    } finally { setTimeout(() => setN8nToggling(t => ({ ...t, [agent.tenantId]: false })), 800); }
  };

  // ─── Chat Up Handlers ─────────────────────────────────────────────────────

  const handleChatupToggle = async (sale: any, enabled: boolean) => {
    setChatupToggling(t => ({ ...t, [sale.tenantId]: true }));
    try {
      // Atualiza localmente otimisticamente
      setSales(prev => prev.map(s => s.tenantId === sale.tenantId ? { ...s, chatupEnabled: enabled } : s));
      await adminApi.updateChatupAccess(sale.tenantId, enabled);
      toast.success(enabled ? `✅ Chat Up liberado para ${sale.clientName}` : `🔒 Chat Up removido de ${sale.clientName}`);
    } catch {
      toast.error('Falha ao alterar acesso ao Chat Up');
      setSales(prev => prev.map(s => s.tenantId === sale.tenantId ? { ...s, chatupEnabled: !enabled } : s));
    } finally { setTimeout(() => setChatupToggling(t => ({ ...t, [sale.tenantId]: false })), 800); }
  };

  // ─── Derived data ─────────────────────────────────────────────────────────

  const paidSetupTenantIds = new Set(sales.filter((s: any) => s.setupStatus === 'paid').map((s: any) => s.tenantId as string));

  const filteredSales = sales.filter(s => {
    if (salesFilter === 'active') return s.subscriptionStatus === 'active';
    if (salesFilter === 'pending') return s.subscriptionStatus !== 'active' && s.subscriptionStatus !== 'canceled' && s.subscriptionStatus !== 'overdue';
    if (salesFilter === 'overdue') return s.subscriptionStatus === 'overdue' || s.subscriptionStatus === 'canceled';
    return true;
  });

  const salesCounts = {
    all: sales.length,
    active: sales.filter(s => s.subscriptionStatus === 'active').length,
    pending: sales.filter(s => s.subscriptionStatus !== 'active' && s.subscriptionStatus !== 'canceled' && s.subscriptionStatus !== 'overdue').length,
    overdue: sales.filter(s => s.subscriptionStatus === 'overdue' || s.subscriptionStatus === 'canceled').length,
  };

  const filteredAgents = (() => {
    const active = agents.filter(a => paidSetupTenantIds.has(a.tenantId));
    const q = searchAgents.toLowerCase();
    return active.filter(a => a.tenantName.toLowerCase().includes(q) || (a.agentName || '').toLowerCase().includes(q));
  })();

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 6rem)', gap: '0', position: 'relative' }}>

      {/* ── Modal: Acesso do Cliente ────────────────────────────────────────── */}
      {saleInfoModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#111318', border: '1px solid #2d303a', borderRadius: '16px', padding: '28px', width: '480px', maxWidth: '90%', color: '#fff', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                <ExternalLink className="w-5 h-5 text-[#d6006e]" />
                Acesso do Cliente
              </h3>
              <button onClick={() => setSaleInfoModal(null)} className="text-gray-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-5">
              <p className="text-sm text-gray-400 leading-relaxed">Envie estas informações para o cliente acessar o painel.</p>
              <div className="bg-[#1a1d24] p-4 rounded-xl border border-[#2d303a] space-y-3">
                <div className="flex justify-between items-center border-b border-[#2d303a] pb-3">
                  <span className="text-gray-400 text-sm">URL do Portal:</span>
                  <span className="font-medium text-white">{window.location.origin}</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#2d303a] pb-3">
                  <span className="text-gray-400 text-sm">Email/Login:</span>
                  <span className="font-medium text-white">{saleInfoModal.email}</span>
                </div>
                <div className="flex justify-between items-center pb-1">
                  <span className="text-gray-400 text-sm">Senha Provisória:</span>
                  {saleInfoModal.defaultPassword
                    ? <span className="font-mono font-bold tracking-widest text-[#d6006e] bg-pink-500/10 px-2.5 py-0.5 rounded border border-pink-500/20">{saleInfoModal.defaultPassword}</span>
                    : <span className="text-xs text-gray-500 italic">Alterada ou não criada</span>
                  }
                </div>
              </div>
              <button
                onClick={() => {
                  const msg = `🚀 *Seu Portal está pronto!*\n\n🌐 *Painel:* ${window.location.origin}\n📧 *Login:* ${saleInfoModal.email}\n🔑 *Senha:* ${saleInfoModal.defaultPassword || '(Sua Senha Pessoal)'}\n\nRecomendamos alterar sua senha no primeiro acesso!`;
                  navigator.clipboard.writeText(msg);
                  toast.success('Mensagem copiada para o WhatsApp!');
                }}
                className="w-full py-3 flex items-center justify-center gap-2 transition-all font-semibold rounded-lg"
                style={{ backgroundColor: '#d6006e', color: '#fff' }}
              >
                <Copy className="w-4 h-4" /> Copiar Mensagem (WhatsApp)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Nova Venda ────────────────────────────────────────────────── */}
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
                  <label className="block text-xs font-medium mb-1" style={{ color: '#555' }}>Nome da Empresa / Cliente</label>
                  <input type="text" value={saleForm.name} onChange={e => setSaleForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="Ex: Clínica João" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#555' }}>E-mail (Login do cliente)</label>
                  <input type="email" value={saleForm.email} onChange={e => setSaleForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} placeholder="cliente@email.com" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#555' }}>Telefone (DDD+Número)</label>
                    <input type="tel" value={saleForm.phone} onChange={e => setSaleForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle} placeholder="11999999999" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#555' }}>CPF ou CNPJ</label>
                    <input type="text" value={saleForm.cpfCnpj} onChange={e => setSaleForm(f => ({ ...f, cpfCnpj: e.target.value }))} style={inputStyle} placeholder="12345678909" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#555' }}>Valor do Setup (R$)</label>
                    <input type="number" value={saleForm.customSetupPrice} onChange={e => setSaleForm(f => ({ ...f, customSetupPrice: Number(e.target.value) }))} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#555' }}>Mensalidade (R$)</label>
                    <input type="number" value={saleForm.customMonthlyPrice} onChange={e => setSaleForm(f => ({ ...f, customMonthlyPrice: Number(e.target.value) }))} style={inputStyle} />
                  </div>
                </div>
                <button onClick={handleCreateSale} disabled={creatingSale} className="w-full py-2.5 mt-2 transition-all font-medium"
                  style={{ backgroundColor: '#d6006e', color: '#fff', borderRadius: '8px', cursor: creatingSale ? 'not-allowed' : 'pointer', opacity: creatingSale ? 0.7 : 1 }}>
                  {creatingSale ? 'Processando Asaas...' : 'Gerar Link e Abrir Pagamento'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: 'rgba(22,163,74,0.1)' }}>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-medium text-center" style={{ color: '#1a1a1a' }}>Venda Cadastrada com Sucesso!</h4>
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-3">
                  <div>
                    <p className="text-xs font-bold text-gray-700">1. Cobrança do Setup 💰</p>
                    <p className="text-xs text-gray-500 mb-1">Link para pagamento do setup via Asaas.</p>
                    <div className="flex items-center gap-2">
                      <input type="text" readOnly value={generatedSale.setupPaymentLink} style={{ ...inputStyle, padding: '6px', fontSize: '12px' }} />
                      <button onClick={() => copyLink(generatedSale.setupPaymentLink, 'Setup')} className="p-2 border border-gray-300 rounded bg-white text-gray-600 hover:bg-gray-50"><Copy className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700">2. Assinatura Mensal 🔄</p>
                    <p className="text-xs text-gray-500 mb-1">Link para mensalidade recorrente.</p>
                    <div className="flex items-center gap-2">
                      <input type="text" readOnly value={generatedSale.subscriptionLink} style={{ ...inputStyle, padding: '6px', fontSize: '12px' }} />
                      <button onClick={() => copyLink(generatedSale.subscriptionLink, 'Assinatura')} className="p-2 border border-gray-300 rounded bg-white text-gray-600 hover:bg-gray-50"><Copy className="w-4 h-4" /></button>
                    </div>
                  </div>
                  {generatedSale.defaultPassword && (
                    <div className="mt-4 pt-3 border-t border-blue-200">
                      <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5 mb-2"><Key className="w-3.5 h-3.5" /> 3. Acesso do Cliente</p>
                      <div className="bg-white p-3 rounded border border-gray-200 text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-500 text-xs">Email/Login:</span>
                          <span className="font-medium text-gray-800">{generatedSale.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 text-xs">Senha Exclusiva:</span>
                          <span className="font-mono font-bold tracking-widest text-[#d6006e] bg-pink-50 px-2 rounded">{generatedSale.defaultPassword}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={() => { setSaleModal(false); setGeneratedSale(null); }} className="w-full py-2 bg-gray-900 text-white rounded-lg text-sm font-medium">Concluir</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── N8N Config Modal ──────────────────────────────────────────────────── */}
      {n8nConfigModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#111318', border: '1px solid #2d303a', borderRadius: '20px', padding: '32px', width: '520px', maxWidth: '95%', color: '#fff', boxShadow: '0 30px 60px -15px rgba(0,0,0,0.6)' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Settings className="w-5 h-5 text-[#d6006e]" /> Configurar Agente N8N</h3>
                <p className="text-sm text-gray-400 mt-1">{n8nConfigModal.tenantName}</p>
              </div>
              <button onClick={() => setN8nConfigModal(null)} className="text-gray-400 hover:text-white transition-colors p-1"><X className="w-6 h-6" /></button>
            </div>
            <div className="bg-[#1a1d24] rounded-xl p-4 mb-5 border border-[#2d303a]">
              <p className="text-xs text-gray-400 leading-relaxed">Cole a URL do Webhook do N8N criado para este cliente. O sistema enviará <code className="text-pink-400">{`{ action, tenantId }`}</code> a cada ativação/desativação.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Nome do Agente</label>
                <input type="text" value={n8nForm.agentName} onChange={e => setN8nForm(f => ({ ...f, agentName: e.target.value }))} placeholder="Ex: Atendimento Pizzaria João" style={darkInputStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">URL do Webhook N8N</label>
                <input type="url" value={n8nForm.webhookUrl} onChange={e => setN8nForm(f => ({ ...f, webhookUrl: e.target.value }))} placeholder="https://n8n.seudominio.com/webhook/xxxxxxxx" style={darkInputStyle} />
              </div>
              {n8nForm.webhookUrl && (
                <button onClick={handleTestN8n} disabled={testingN8n}
                  className="w-full py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#1a1d24', border: '1px solid #2d303a', color: testN8nResult === 'ok' ? '#22c55e' : testN8nResult === 'error' ? '#ef4444' : '#a0a0a0', cursor: testingN8n ? 'not-allowed' : 'pointer' }}>
                  <ExternalLink className="w-4 h-4" />
                  {testingN8n ? 'Testando...' : testN8nResult === 'ok' ? '✅ Webhook OK!' : testN8nResult === 'error' ? '❌ Falhou — Verifique a URL' : 'Testar Conexão N8N'}
                </button>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setN8nConfigModal(null)} className="flex-1 py-3 text-sm font-medium rounded-xl" style={{ backgroundColor: '#1a1d24', border: '1px solid #2d303a', color: '#a0a0a0' }}>Cancelar</button>
                <button onClick={handleSaveN8n} disabled={savingN8n || !n8nForm.webhookUrl}
                  className="flex-1 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2"
                  style={{ backgroundColor: !n8nForm.webhookUrl ? '#2d303a' : '#d6006e', color: '#fff', opacity: savingN8n ? 0.7 : 1, cursor: !n8nForm.webhookUrl ? 'not-allowed' : 'pointer' }}>
                  <Save className="w-4 h-4" />{savingN8n ? 'Salvando...' : 'Salvar e Vincular'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Bar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between border-b border-gray-200 pb-0 shrink-0 mb-6 mt-2">
        <div className="flex items-center gap-1">
          {([
            { id: 'sales',  icon: ShoppingCart, label: 'Vendas e Clientes' },
            { id: 'agents', icon: Bot,           label: 'Agentes N8N' },
            { id: 'chatup', icon: Headphones,    label: 'Chat Up' },
          ] as const).map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === id ? 'border-[#d6006e] text-[#d6006e]' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
              <Icon className="w-4 h-4" />
              {label}
              {id === 'chatup' && (
                <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>NOVO</span>
              )}
            </button>
          ))}
        </div>

        <div className="pb-3 border-b-2 border-transparent flex items-center gap-2">
          {(activeTab === 'sales' || activeTab === 'chatup') && (
            <div className="flex items-center gap-2">
              {lastRefreshed && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {lastRefreshed.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
              <button onClick={() => loadSales(true)} disabled={isRefreshing}
                className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-all" title="Atualizar">
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
          {activeTab === 'sales' && (
            <button
              onClick={() => { setSaleForm({ name: '', email: '', phone: '', cpfCnpj: '', customSetupPrice: 1500, customMonthlyPrice: 297 }); setGeneratedSale(null); setSaleModal(true); }}
              className="px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-all text-white hover:opacity-90 flex items-center gap-2"
              style={{ backgroundColor: '#d6006e' }}>
              <ShoppingCart className="w-4 h-4" /> Nova Venda
            </button>
          )}
        </div>
      </div>

      {/* ── TAB: VENDAS E CLIENTES ────────────────────────────────────────────── */}
      {activeTab === 'sales' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Sub-filter tabs */}
          <div className="flex items-center gap-2 mb-5">
            {([
              { id: 'all',     label: 'Todos',      color: '#6b7280' },
              { id: 'active',  label: 'Ativos',     color: '#16a34a' },
              { id: 'pending', label: 'Aguardando', color: '#d97706' },
              { id: 'overdue', label: 'Vencidos',   color: '#dc2626' },
            ] as const).map(({ id, label, color }) => {
              const count = salesCounts[id];
              const isActive = salesFilter === id;
              return (
                <button key={id} onClick={() => setSalesFilter(id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border"
                  style={{
                    backgroundColor: isActive ? color + '12' : 'transparent',
                    borderColor: isActive ? color + '40' : '#e5e7eb',
                    color: isActive ? color : '#6b7280',
                  }}>
                  {label}
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: isActive ? color + '20' : '#f3f4f6', color: isActive ? color : '#9ca3af' }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {loadingSales ? (
            <div className="flex items-center justify-center py-16"><div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d6006e' }} /></div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-400 font-medium">Nenhum cliente encontrado</p>
              <p className="text-gray-300 text-sm mt-1">Tente outro filtro ou crie uma nova venda</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-dark-800 rounded-xl">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-dark-900 border-b border-dark-800 text-white">
                  <tr>
                    <th className="font-semibold p-3 text-xs uppercase tracking-wider text-gray-400">Cliente</th>
                    <th className="font-semibold p-3 text-xs uppercase tracking-wider text-gray-400">Plano / Produtos</th>
                    <th className="font-semibold p-3 text-xs uppercase tracking-wider text-gray-400">Setup</th>
                    <th className="font-semibold p-3 text-xs uppercase tracking-wider text-gray-400">Assinatura Mensal</th>
                    <th className="font-semibold p-3 text-xs uppercase tracking-wider text-gray-400">Data</th>
                    <th className="font-semibold p-3 text-xs uppercase tracking-wider text-gray-400 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800 bg-dark-950">
                  {filteredSales.map((s, idx) => (
                    <tr key={s.id} className={`${idx % 2 === 0 ? 'bg-dark-950' : 'bg-dark-900/50'} hover:bg-dark-800/80 transition-colors`}>
                      <td className="p-4">
                        <div className="font-semibold text-white">{s.clientName}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{s.email}</div>
                        {s.defaultPassword && (
                          <div className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-gray-400 bg-dark-800 px-1.5 py-0.5 rounded border border-dark-700">
                            <Key className="w-3 h-3 text-[#d6006e]" /> Senha gerada:
                            <span className="font-mono text-gray-500">{s.defaultPassword}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <ProductBadges sale={s} />
                      </td>
                      <td className="p-4">
                        <StatusBadge status={s.setupStatus} />
                        {(s.setupStatus === 'pending' || s.setupStatus === 'overdue') && s.setupPaymentLink && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <button onClick={() => copyLink(s.setupPaymentLink, 'Setup')} className="text-xs text-blue-400 hover:underline">Copiar</button>
                            <span className="text-gray-600">|</span>
                            <button onClick={() => window.open(s.setupPaymentLink, '_blank')} className="text-xs text-[#d6006e] hover:underline font-medium">Abrir ↗</button>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <StatusBadge status={s.subscriptionStatus} />
                        {s.subscriptionStatus === 'active' && s.subscriptionNextDueDate && (() => {
                          const [, y, m, d] = s.subscriptionNextDueDate.match(/^(\d{4})-(\d{2})-(\d{2})/) || [];
                          if (!y) return null;
                          const due = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                          const diff = Math.ceil((due.getTime() - Date.now()) / 86400000);
                          const cls = diff <= 3 ? 'text-red-400 font-bold' : diff <= 7 ? 'text-orange-400' : 'text-gray-400';
                          return (
                            <div className={`flex items-center gap-1 mt-1 text-[11px] ${cls}`}>
                              <Calendar className="w-3 h-3" />
                              {diff === 0 ? 'Vence hoje' : diff < 0 ? `Vencido há ${Math.abs(diff)}d` : `Renova em ${diff}d`}
                            </div>
                          );
                        })()}
                        {(s.subscriptionStatus !== 'active' && s.subscriptionStatus !== 'canceled') && s.subscriptionLink && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <button onClick={() => copyLink(s.subscriptionLink, 'Assinatura')} className="text-[11px] text-blue-400 hover:underline">Copiar</button>
                            <span className="text-gray-600">|</span>
                            <button onClick={() => window.open(s.subscriptionLink, '_blank')} className="text-[11px] text-[#d6006e] hover:underline font-medium">Abrir ↗</button>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-xs text-gray-500">{new Date(s.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td className="p-4 text-center">
                        <button onClick={() => setSaleInfoModal(s)}
                          className="p-1.5 rounded bg-dark-800 text-gray-400 hover:bg-dark-700 hover:text-white transition-colors border border-dark-700"
                          title="Informações de Acesso">
                          <Info className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: AGENTES N8N ─────────────────────────────────────────────────── */}
      {activeTab === 'agents' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Buscar clientes com setup pago..."
              value={searchAgents} onChange={e => setSearchAgents(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '36px' }} />
          </div>

          {(loadingAgents || loadingSales) ? (
            <div className="flex items-center justify-center py-16"><div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d6006e' }} /></div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-16">
              <Bot className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400 font-medium">Nenhum cliente com setup pago</p>
              <p className="text-gray-600 text-sm mt-1">Apenas clientes com pagamento aprovado aparecem aqui</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-dark-800 rounded-xl">
              <table className="w-full text-sm text-left">
                <thead style={{ backgroundColor: '#111318', borderBottom: '1px solid #2d303a' }}>
                  <tr>
                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Cliente</th>
                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Agente N8N</th>
                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tenant ID</th>
                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAgents.map((agent, idx) => {
                    const isToggling = n8nToggling[agent.tenantId];
                    const statusColor = !agent.configured ? '#6b7280' : agent.active ? '#22c55e' : '#f59e0b';
                    const statusLabel = !agent.configured ? 'Não Configurado' : agent.active ? 'Ativo' : 'Configurado';
                    const statusBg = !agent.configured ? 'rgba(107,114,128,0.1)' : agent.active ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)';

                    return (
                      <tr key={agent.tenantId} style={{ backgroundColor: idx % 2 === 0 ? '#0d0f14' : '#111318', borderBottom: '1px solid #1e2028' }}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: agent.active ? 'rgba(214,0,110,0.15)' : '#1a1d24' }}>
                              <Bot className="w-4 h-4" style={{ color: agent.active ? '#d6006e' : '#6b7280' }} />
                            </div>
                            <div className="font-semibold text-white text-sm">{agent.tenantName}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          {agent.agentName
                            ? <span className="text-gray-300 text-sm">{agent.agentName}</span>
                            : <span className="text-gray-600 text-xs italic">Sem nome definido</span>}
                          {agent.webhookUrl && (
                            <div className="text-[11px] text-gray-600 mt-0.5 truncate max-w-[180px]" title={agent.webhookUrl}>
                              {agent.webhookUrl.replace('https://', '').substring(0, 30)}...
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: statusBg, color: statusColor }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor, boxShadow: agent.active ? `0 0 6px ${statusColor}` : 'none' }} />
                            {statusLabel}
                          </span>
                        </td>
                        <td className="p-4">
                          <code className="text-[11px] text-gray-500 bg-[#1a1d24] px-2 py-1 rounded border border-[#2d303a] font-mono">{agent.tenantId.substring(0, 16)}...</code>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => openN8nConfig(agent)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                              style={{ backgroundColor: '#1a1d24', border: '1px solid #2d303a', color: '#a0a0a0' }}>
                              <Settings className="w-3.5 h-3.5" /> Configurar
                            </button>
                            {agent.configured && (
                              <button onClick={() => handleN8nToggle(agent, !agent.active)} disabled={isToggling}
                                className="relative flex-shrink-0 transition-all"
                                style={{ cursor: isToggling ? 'not-allowed' : 'pointer', opacity: isToggling ? 0.5 : 1 }}>
                                <div style={{ width: '44px', height: '26px', borderRadius: '13px', backgroundColor: agent.active ? '#d6006e' : '#2d303a', position: 'relative', transition: 'all 0.3s', boxShadow: agent.active ? '0 0 10px rgba(214,0,110,0.4)' : 'none' }}>
                                  <div style={{ position: 'absolute', top: '3px', left: agent.active ? '21px' : '3px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', transition: 'left 0.3s' }} />
                                </div>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: CHAT UP ─────────────────────────────────────────────────────── */}
      {activeTab === 'chatup' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Info Banner */}
          <div className="flex items-start gap-3 p-4 mb-5 rounded-xl border" style={{ backgroundColor: 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.2)' }}>
            <Headphones className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#6366f1' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#6366f1' }}>Chat Up — Gerenciamento de Acesso</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Libere ou revogue o acesso ao <strong>Chat Up</strong> para cada cliente com um clique. Apenas clientes com setup pago aparecem aqui.
                O card "Chat Up" no dashboard do cliente será ativado automaticamente.
              </p>
            </div>
          </div>

          {loadingSales ? (
            <div className="flex items-center justify-center py-16"><div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#6366f1' }} /></div>
          ) : sales.filter(s => s.setupStatus === 'paid').length === 0 ? (
            <div className="text-center py-16">
              <Headphones className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-400 font-medium">Nenhum cliente com setup pago</p>
              <p className="text-gray-300 text-sm mt-1">Clientes aparecem aqui após pagamento do setup</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-dark-800 rounded-xl">
              <table className="w-full text-sm text-left">
                <thead style={{ backgroundColor: '#111318', borderBottom: '1px solid #2d303a' }}>
                  <tr>
                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Cliente</th>
                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Plano Base</th>
                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Assinatura</th>
                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Acesso Chat Up</th>
                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.filter(s => s.setupStatus === 'paid').map((sale, idx) => {
                    const isEnabled = !!sale.chatupEnabled;
                    const isToggling = chatupToggling[sale.tenantId];

                    return (
                      <tr key={sale.id} style={{ backgroundColor: idx % 2 === 0 ? '#0d0f14' : '#111318', borderBottom: '1px solid #1e2028' }}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: isEnabled ? 'rgba(99,102,241,0.15)' : '#1a1d24' }}>
                              <Headphones className="w-4 h-4" style={{ color: isEnabled ? '#6366f1' : '#6b7280' }} />
                            </div>
                            <div>
                              <div className="font-semibold text-white text-sm">{sale.clientName}</div>
                              <div className="text-xs text-gray-500">{sale.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md border border-dark-700 bg-dark-800/50 text-gray-300">
                            {sale.setupPlanName || 'Custom'}
                          </span>
                        </td>
                        <td className="p-4"><StatusBadge status={sale.subscriptionStatus} /></td>
                        <td className="p-4 text-center">
                          {isEnabled ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                              style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.25)' }}>
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" style={{ boxShadow: '0 0 6px #6366f1' }} />
                              Liberado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                              style={{ backgroundColor: 'rgba(107,114,128,0.1)', color: '#6b7280', border: '1px solid rgba(107,114,128,0.2)' }}>
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                              Bloqueado
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleChatupToggle(sale, !isEnabled)}
                            disabled={isToggling}
                            title={isEnabled ? 'Revogar acesso ao Chat Up' : 'Liberar acesso ao Chat Up'}
                            style={{ cursor: isToggling ? 'not-allowed' : 'pointer', opacity: isToggling ? 0.5 : 1 }}
                          >
                            <div style={{
                              width: '52px', height: '28px', borderRadius: '14px',
                              backgroundColor: isEnabled ? '#6366f1' : '#2d303a',
                              position: 'relative', transition: 'all 0.3s',
                              boxShadow: isEnabled ? '0 0 12px rgba(99,102,241,0.4)' : 'none',
                            }}>
                              <div style={{
                                position: 'absolute', top: '4px',
                                left: isEnabled ? '26px' : '4px',
                                width: '20px', height: '20px', borderRadius: '50%',
                                backgroundColor: '#fff',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                                transition: 'left 0.3s',
                              }} />
                            </div>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Info footer */}
          <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
            <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
            <span>O acesso ao Chat Up é independente do Agente N8N. Você pode liberar um sem o outro.</span>
          </div>
        </div>
      )}
    </div>
  );
}
