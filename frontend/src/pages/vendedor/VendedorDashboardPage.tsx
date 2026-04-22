import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Users, X, CheckCircle, Copy, Key } from 'lucide-react';
import { adminApi } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

// ─── Input style for sale modal ──────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 13px', backgroundColor: '#fafafa',
  border: '1px solid #e0e0e0', borderRadius: '9px', color: '#1a1a1a',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
};

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 110 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #d6006e 0%, #9b0054 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 800, color: '#fff',
      boxShadow: '0 0 0 5px rgba(214,0,110,0.15), 0 12px 40px rgba(214,0,110,0.3)',
      letterSpacing: '-0.5px',
    }}>
      {initials || '?'}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function VendedorDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const sellerId = user?.id || '';

  // Nova Venda modal
  const [saleModal, setSaleModal] = useState(false);
  const [saleForm, setSaleForm] = useState({
    name: '', email: '', phone: '', cpfCnpj: '',
    customSetupPrice: 1500, customMonthlyPrice: 297,
  });
  const [creatingSale, setCreatingSale] = useState(false);
  const [generatedSale, setGeneratedSale] = useState<any>(null);

  const openSaleModal = () => {
    setSaleForm({ name: '', email: '', phone: '', cpfCnpj: '', customSetupPrice: 1500, customMonthlyPrice: 297 });
    setGeneratedSale(null);
    setSaleModal(true);
  };

  const handleCreateSale = async () => {
    if (!saleForm.name || !saleForm.email) { toast.error('Preencha Nome e E-mail.'); return; }
    setCreatingSale(true);
    try {
      const res = await adminApi.createSale({ ...saleForm, sellerId });
      setGeneratedSale(res);
      toast.success('Cliente gerado com sucesso!');
      if (res.setupPaymentLink) window.open(res.setupPaymentLink, '_blank');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Erro ao gerar link de venda');
    } finally { setCreatingSale(false); }
  };

  const copyLink = (link: string, name: string) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    toast.success(`Link de ${name} copiado!`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 120px)' }}>

      {/* ── Modal: Nova Venda ─────────────────────────────────────────────── */}
      {saleModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '18px', padding: '28px',
            width: '460px', maxWidth: '92%', boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
                Nova Venda / Setup
              </h3>
              <button onClick={() => { setSaleModal(false); setGeneratedSale(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X style={{ width: '20px', height: '20px', color: '#8a8a8a' }} />
              </button>
            </div>

            {!generatedSale ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '5px' }}>
                    Nome da Empresa / Cliente
                  </label>
                  <input type="text" value={saleForm.name}
                    onChange={e => setSaleForm(f => ({ ...f, name: e.target.value }))}
                    style={inputStyle} placeholder="Ex: Clínica João" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '5px' }}>
                    E-mail (Login do cliente)
                  </label>
                  <input type="email" value={saleForm.email}
                    onChange={e => setSaleForm(f => ({ ...f, email: e.target.value }))}
                    style={inputStyle} placeholder="cliente@email.com" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '5px' }}>Telefone</label>
                    <input type="tel" value={saleForm.phone}
                      onChange={e => setSaleForm(f => ({ ...f, phone: e.target.value }))}
                      style={inputStyle} placeholder="11999999999" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '5px' }}>CPF ou CNPJ</label>
                    <input type="text" value={saleForm.cpfCnpj}
                      onChange={e => setSaleForm(f => ({ ...f, cpfCnpj: e.target.value }))}
                      style={inputStyle} placeholder="12345678909" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '5px' }}>Setup (R$)</label>
                    <input type="number" value={saleForm.customSetupPrice}
                      onChange={e => setSaleForm(f => ({ ...f, customSetupPrice: Number(e.target.value) }))}
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '5px' }}>Mensalidade (R$)</label>
                    <input type="number" value={saleForm.customMonthlyPrice}
                      onChange={e => setSaleForm(f => ({ ...f, customMonthlyPrice: Number(e.target.value) }))}
                      style={inputStyle} />
                  </div>
                </div>
                <button onClick={handleCreateSale} disabled={creatingSale} style={{
                  width: '100%', padding: '13px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #d6006e, #9b0054)',
                  color: '#fff', fontSize: '14px', fontWeight: 700,
                  cursor: creatingSale ? 'not-allowed' : 'pointer', opacity: creatingSale ? 0.7 : 1,
                  marginTop: '4px', boxShadow: '0 4px 14px rgba(214,0,110,0.35)',
                }}>
                  {creatingSale ? 'Processando...' : 'Gerar Link e Abrir Pagamento'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(22,163,74,0.1)' }}>
                  <CheckCircle style={{ width: '26px', height: '26px', color: '#16a34a' }} />
                </div>
                <h4 style={{ textAlign: 'center', fontWeight: 700, color: '#1a1a1a', margin: 0, fontSize: '16px' }}>Venda Cadastrada!</h4>
                <div style={{ padding: '14px', backgroundColor: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#374151', margin: '0 0 5px' }}>1. Link de Setup 💰</p>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input type="text" readOnly value={generatedSale.setupPaymentLink}
                        style={{ ...inputStyle, padding: '6px 10px', fontSize: '11px', flex: 1, backgroundColor: '#fff' }} />
                      <button onClick={() => copyLink(generatedSale.setupPaymentLink, 'Setup')}
                        style={{ padding: '6px 10px', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#fff', cursor: 'pointer' }}>
                        <Copy style={{ width: '14px', height: '14px' }} />
                      </button>
                    </div>
                  </div>
                  <div style={{ marginBottom: generatedSale.defaultPassword ? '12px' : 0 }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#374151', margin: '0 0 5px' }}>2. Assinatura Mensal 🔄</p>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input type="text" readOnly value={generatedSale.subscriptionLink}
                        style={{ ...inputStyle, padding: '6px 10px', fontSize: '11px', flex: 1, backgroundColor: '#fff' }} />
                      <button onClick={() => copyLink(generatedSale.subscriptionLink, 'Assinatura')}
                        style={{ padding: '6px 10px', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#fff', cursor: 'pointer' }}>
                        <Copy style={{ width: '14px', height: '14px' }} />
                      </button>
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
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#d6006e', backgroundColor: 'rgba(214,0,110,0.08)', padding: '1px 6px', borderRadius: '4px' }}>
                            {generatedSale.defaultPassword}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={() => { setSaleModal(false); setGeneratedSale(null); }}
                  style={{ width: '100%', padding: '11px', backgroundColor: '#1a1a1a', color: '#fff', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                  Concluir
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Card de Perfil ─────────────────────────────────────────────────── */}
      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: 'linear-gradient(160deg, #180020 0%, #0a0b0f 70%)',
        border: '1px solid rgba(214,0,110,0.2)',
        borderRadius: '28px',
        padding: '48px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
      }}>
        {/* Background glow top-right */}
        <div style={{
          position: 'absolute', top: '-60px', right: '-60px',
          width: '240px', height: '240px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(214,0,110,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        {/* Background glow bottom-left */}
        <div style={{
          position: 'absolute', bottom: '-40px', left: '10%',
          width: '180px', height: '180px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(214,0,110,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Avatar */}
        <Avatar name={user?.displayName || 'Vendedor'} size={110} />

        {/* Role badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          backgroundColor: 'rgba(214,0,110,0.12)', border: '1px solid rgba(214,0,110,0.3)',
          borderRadius: '20px', padding: '4px 14px', margin: '20px 0 10px',
        }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#d6006e', textTransform: 'uppercase', letterSpacing: '1px' }}>
            🏆 Vendedor
          </span>
        </div>

        {/* Name & email */}
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', margin: '0 0 6px', lineHeight: 1.2 }}>
          {user?.displayName}
        </h1>
        <p style={{ fontSize: '14px', color: '#8b8fa8', margin: '0 0 36px' }}>
          {user?.email}
        </p>

        {/* Divider */}
        <div style={{ width: '100%', height: '1px', backgroundColor: 'rgba(214,0,110,0.12)', marginBottom: '32px' }} />

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          <button
            id="btn-nova-venda"
            onClick={openSaleModal}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              padding: '15px 24px', borderRadius: '14px', border: 'none',
              background: 'linear-gradient(135deg, #d6006e, #9b0054)',
              color: '#fff', fontSize: '15px', fontWeight: 700,
              cursor: 'pointer', width: '100%',
              boxShadow: '0 6px 24px rgba(214,0,110,0.4)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 10px 32px rgba(214,0,110,0.5)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 24px rgba(214,0,110,0.4)'; }}
          >
            <ShoppingCart style={{ width: '19px', height: '19px' }} />
            Nova Venda
          </button>

          <button
            id="btn-meus-clientes"
            onClick={() => navigate('/vendedor/clientes')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              padding: '15px 24px', borderRadius: '14px',
              border: '1px solid rgba(214,0,110,0.3)',
              backgroundColor: 'rgba(214,0,110,0.07)',
              color: '#d6006e', fontSize: '15px', fontWeight: 600,
              cursor: 'pointer', width: '100%',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(214,0,110,0.13)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(214,0,110,0.07)'; }}
          >
            <Users style={{ width: '19px', height: '19px' }} />
            Meus Clientes
          </button>
        </div>
      </div>
    </div>
  );
}
