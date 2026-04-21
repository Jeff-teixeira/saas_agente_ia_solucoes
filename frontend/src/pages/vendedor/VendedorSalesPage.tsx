import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShoppingCart, X, CheckCircle, XCircle, Copy, Key,
  RefreshCw, Clock, Calendar, Info, AlertCircle,
} from 'lucide-react';
import { adminApi } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', backgroundColor: '#fafafa',
  border: '1px solid #e0e0e0', borderRadius: '8px', color: '#1a1a1a',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VendedorSalesPage() {
  const { user } = useAuth();
  const sellerId = user?.id || '';

  const [sales, setSales] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Modal Nova Venda
  const [saleModal, setSaleModal] = useState(false);
  const [saleForm, setSaleForm] = useState({ name: '', email: '', phone: '', cpfCnpj: '', customSetupPrice: 1500, customMonthlyPrice: 297 });
  const [creatingSale, setCreatingSale] = useState(false);
  const [generatedSale, setGeneratedSale] = useState<any>(null);
  const [saleInfoModal, setSaleInfoModal] = useState<any>(null);

  // ─── Loader ───────────────────────────────────────────────────────────────

  const loadSales = useCallback(async (silent = false) => {
    if (!silent) setLoadingSales(true);
    else setIsRefreshing(true);
    try {
      const data = await adminApi.listSales({ sellerId });
      setSales(data.orders || []);
      setLastRefreshed(new Date());
    } catch {
      if (!silent) toast.error('Falha ao carregar vendas');
    } finally {
      setLoadingSales(false);
      setIsRefreshing(false);
    }
  }, [sellerId]);

  useEffect(() => {
    loadSales();
    refreshIntervalRef.current = setInterval(() => loadSales(true), 30000);
    return () => { if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current); };
  }, [loadSales]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleCreateSale = async () => {
    if (!saleForm.name || !saleForm.email) { toast.error('Preencha Nome e E-mail.'); return; }
    setCreatingSale(true);
    try {
      const res = await adminApi.createSale({ ...saleForm, sellerId });
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

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingCart style={{ width: '22px', height: '22px', color: '#d6006e' }} />
            Minhas Vendas
          </h1>
          <p style={{ fontSize: '13px', color: '#8b8fa8', margin: '4px 0 0' }}>
            {sales.length} {sales.length === 1 ? 'cliente' : 'clientes'} cadastrados por você
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {lastRefreshed && (
            <span style={{ fontSize: '11px', color: '#8b8fa8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock style={{ width: '11px', height: '11px' }} />
              {lastRefreshed.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => loadSales(true)}
            disabled={isRefreshing}
            style={{ padding: '8px', borderRadius: '10px', border: '1px solid #2d303a', background: '#1a1d24', cursor: isRefreshing ? 'not-allowed' : 'pointer', color: '#8b8fa8' }}
            title="Atualizar"
          >
            <RefreshCw style={{ width: '15px', height: '15px', animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button
            onClick={() => { setSaleForm({ name: '', email: '', phone: '', cpfCnpj: '', customSetupPrice: 1500, customMonthlyPrice: 297 }); setGeneratedSale(null); setSaleModal(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #d6006e, #9b0054)', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(214,0,110,0.3)' }}
          >
            <ShoppingCart style={{ width: '16px', height: '16px' }} />
            Nova Venda
          </button>
        </div>
      </div>

      {/* Modal: Acesso do Cliente */}
      {saleInfoModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#111318', border: '1px solid #2d303a', borderRadius: '16px', padding: '28px', width: '480px', maxWidth: '90%', color: '#fff', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>Acesso do Cliente</h3>
              <button onClick={() => setSaleInfoModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b8fa8' }}><X style={{ width: '20px', height: '20px' }} /></button>
            </div>
            <div style={{ backgroundColor: '#1a1d24', padding: '16px', borderRadius: '12px', border: '1px solid #2d303a', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', marginBottom: '10px', borderBottom: '1px solid #2d303a' }}>
                <span style={{ fontSize: '13px', color: '#8b8fa8' }}>URL do Portal:</span>
                <span style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>{window.location.origin}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', marginBottom: '10px', borderBottom: '1px solid #2d303a' }}>
                <span style={{ fontSize: '13px', color: '#8b8fa8' }}>Email/Login:</span>
                <span style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>{saleInfoModal.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#8b8fa8' }}>Senha Provisória:</span>
                {saleInfoModal.defaultPassword
                  ? <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#d6006e', backgroundColor: 'rgba(214,0,110,0.1)', padding: '2px 8px', borderRadius: '6px' }}>{saleInfoModal.defaultPassword}</span>
                  : <span style={{ fontSize: '12px', color: '#8b8fa8', fontStyle: 'italic' }}>Já foi alterada</span>
                }
              </div>
            </div>
            <button
              onClick={() => {
                const msg = `🚀 *Seu Portal está pronto!*\n\n🌐 *Painel:* ${window.location.origin}\n📧 *Login:* ${saleInfoModal.email}\n🔑 *Senha:* ${saleInfoModal.defaultPassword || '(Sua Senha Pessoal)'}\n\nRecomendamos alterar sua senha no primeiro acesso!`;
                navigator.clipboard.writeText(msg);
                toast.success('Mensagem copiada!');
              }}
              style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#d6006e', color: '#fff', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
            >
              <Copy style={{ width: '16px', height: '16px' }} /> Copiar Mensagem (WhatsApp)
            </button>
          </div>
        </div>
      )}

      {/* Modal: Nova Venda */}
      {saleModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', width: '450px', maxWidth: '90%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Nova Venda / Setup</h3>
              <button onClick={() => { setSaleModal(false); setGeneratedSale(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X style={{ width: '20px', height: '20px', color: '#8a8a8a' }} />
              </button>
            </div>
            {!generatedSale ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '4px' }}>Nome da Empresa / Cliente</label>
                  <input type="text" value={saleForm.name} onChange={e => setSaleForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="Ex: Clínica João" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '4px' }}>E-mail (Login do cliente)</label>
                  <input type="email" value={saleForm.email} onChange={e => setSaleForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} placeholder="cliente@email.com" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '4px' }}>Telefone</label>
                    <input type="tel" value={saleForm.phone} onChange={e => setSaleForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle} placeholder="11999999999" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '4px' }}>CPF ou CNPJ</label>
                    <input type="text" value={saleForm.cpfCnpj} onChange={e => setSaleForm(f => ({ ...f, cpfCnpj: e.target.value }))} style={inputStyle} placeholder="12345678909" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '4px' }}>Setup (R$)</label>
                    <input type="number" value={saleForm.customSetupPrice} onChange={e => setSaleForm(f => ({ ...f, customSetupPrice: Number(e.target.value) }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '4px' }}>Mensalidade (R$)</label>
                    <input type="number" value={saleForm.customMonthlyPrice} onChange={e => setSaleForm(f => ({ ...f, customMonthlyPrice: Number(e.target.value) }))} style={inputStyle} />
                  </div>
                </div>
                <button
                  onClick={handleCreateSale}
                  disabled={creatingSale}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#d6006e', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: creatingSale ? 'not-allowed' : 'pointer', opacity: creatingSale ? 0.7 : 1, marginTop: '4px' }}
                >
                  {creatingSale ? 'Processando Asaas...' : 'Gerar Link e Abrir Pagamento'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(22,163,74,0.1)' }}>
                  <CheckCircle style={{ width: '24px', height: '24px', color: '#16a34a' }} />
                </div>
                <h4 style={{ textAlign: 'center', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Venda Cadastrada!</h4>
                <div style={{ padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '10px', border: '1px solid #bae6fd' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#374151', margin: '0 0 4px' }}>1. Link de Setup 💰</p>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input type="text" readOnly value={generatedSale.setupPaymentLink} style={{ ...inputStyle, padding: '6px', fontSize: '11px', flex: 1 }} />
                      <button onClick={() => copyLink(generatedSale.setupPaymentLink, 'Setup')} style={{ padding: '6px 10px', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#fff', cursor: 'pointer' }}><Copy style={{ width: '14px', height: '14px' }} /></button>
                    </div>
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#374151', margin: '0 0 4px' }}>2. Assinatura Mensal 🔄</p>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input type="text" readOnly value={generatedSale.subscriptionLink} style={{ ...inputStyle, padding: '6px', fontSize: '11px', flex: 1 }} />
                      <button onClick={() => copyLink(generatedSale.subscriptionLink, 'Assinatura')} style={{ padding: '6px 10px', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#fff', cursor: 'pointer' }}><Copy style={{ width: '14px', height: '14px' }} /></button>
                    </div>
                  </div>
                  {generatedSale.defaultPassword && (
                    <div style={{ paddingTop: '10px', borderTop: '1px solid #bae6fd' }}>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#374151', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Key style={{ width: '12px', height: '12px' }} /> 3. Acesso do Cliente
                      </p>
                      <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #e0e0e0', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: '#8b8b8b' }}>Email:</span>
                          <span style={{ fontWeight: 500 }}>{generatedSale.email}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#8b8b8b' }}>Senha:</span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#d6006e', backgroundColor: 'rgba(214,0,110,0.08)', padding: '1px 6px', borderRadius: '4px' }}>{generatedSale.defaultPassword}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={() => { setSaleModal(false); setGeneratedSale(null); }} style={{ width: '100%', padding: '10px', backgroundColor: '#1a1a1a', color: '#fff', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
                  Concluir
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabela de Vendas */}
      {loadingSales ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #d6006e', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : sales.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#8b8fa8' }}>
          <ShoppingCart style={{ width: '48px', height: '48px', margin: '0 auto 16px', color: '#2d303a' }} />
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#5b5f70', margin: '0 0 8px' }}>Nenhuma venda ainda</p>
          <p style={{ fontSize: '13px', margin: 0 }}>Clique em "Nova Venda" para cadastrar seu primeiro cliente</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid #1e2028' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#111318', borderBottom: '1px solid #2d303a' }}>
                {['Cliente', 'Setup', 'Assinatura', 'Data', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sales.map((s, idx) => (
                <tr key={s.id} style={{ backgroundColor: idx % 2 === 0 ? '#0d0f14' : '#111318', borderBottom: '1px solid #1e2028' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{s.clientName}</div>
                    <div style={{ fontSize: '11px', color: '#8b8fa8', marginTop: '2px' }}>{s.email}</div>
                    {s.defaultPassword && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '10px', color: '#8b8fa8', backgroundColor: '#1a1d24', padding: '2px 6px', borderRadius: '4px', border: '1px solid #2d303a' }}>
                        <Key style={{ width: '10px', height: '10px', color: '#d6006e' }} />
                        <span style={{ fontFamily: 'monospace', color: '#8b8fa8' }}>{s.defaultPassword}</span>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}><StatusBadge status={s.setupStatus} /></td>
                  <td style={{ padding: '14px 16px' }}>
                    <StatusBadge status={s.subscriptionStatus} />
                    {s.subscriptionStatus === 'active' && s.subscriptionNextDueDate && (() => {
                      const [, y, m, d] = s.subscriptionNextDueDate.match(/^(\d{4})-(\d{2})-(\d{2})/) || [];
                      if (!y) return null;
                      const diff = Math.ceil((new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).getTime() - Date.now()) / 86400000);
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '11px', color: diff <= 3 ? '#ef4444' : '#8b8fa8' }}>
                          <Calendar style={{ width: '10px', height: '10px' }} />
                          {diff === 0 ? 'Vence hoje' : diff < 0 ? `Vencido há ${Math.abs(diff)}d` : `Renova em ${diff}d`}
                        </div>
                      );
                    })()}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '12px', color: '#8b8fa8' }}>
                    {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <button
                      onClick={() => setSaleInfoModal(s)}
                      style={{ padding: '6px', borderRadius: '8px', backgroundColor: '#1a1d24', border: '1px solid #2d303a', cursor: 'pointer', color: '#8b8fa8' }}
                      title="Ver acesso do cliente"
                    >
                      <Info style={{ width: '15px', height: '15px' }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
