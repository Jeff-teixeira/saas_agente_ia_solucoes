import { useState, useEffect, useCallback } from 'react';
import { Users, CheckCircle, XCircle, Search, RefreshCw } from 'lucide-react';
import { adminApi } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

export default function VendedorClientsPage() {
  const { user } = useAuth();
  const sellerId = user?.id || '';

  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.listSales({ sellerId });
      setSales(data.orders || []);
    } catch {
      toast.error('Falha ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => { loadClients(); }, [loadClients]);

  const filtered = sales.filter(s =>
    !search ||
    s.clientName?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: sales.length,
    setupPago: sales.filter(s => s.setupStatus === 'paid').length,
    assinaturaAtiva: sales.filter(s => s.subscriptionStatus === 'active').length,
    pendente: sales.filter(s => s.setupStatus !== 'paid').length,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users style={{ width: '22px', height: '22px', color: '#d6006e' }} />
            Meus Clientes
          </h1>
          <p style={{ fontSize: '13px', color: '#8b8fa8', margin: '4px 0 0' }}>
            Todos os clientes que você cadastrou
          </p>
        </div>
        <button
          onClick={loadClients}
          disabled={loading}
          style={{ padding: '9px', borderRadius: '10px', border: '1px solid #2d303a', background: '#1a1d24', cursor: loading ? 'not-allowed' : 'pointer', color: '#8b8fa8' }}
          title="Atualizar"
        >
          <RefreshCw style={{ width: '15px', height: '15px', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px', marginBottom: '28px' }}>
        {[
          { label: 'Total de Clientes', value: stats.total, color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
          { label: 'Setup Pago', value: stats.setupPago, color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
          { label: 'Assinatura Ativa', value: stats.assinaturaAtiva, color: '#d6006e', bg: 'rgba(214,0,110,0.08)' },
          { label: 'Aguardando Pagto', value: stats.pendente, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
        ].map(stat => (
          <div key={stat.label} style={{
            backgroundColor: '#111318', border: '1px solid #1e2028', borderRadius: '14px',
            padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px',
          }}>
            <span style={{ fontSize: '11px', color: '#8b8fa8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</span>
            <span style={{ fontSize: '28px', fontWeight: 700, color: stat.color }}>{stat.value}</span>
            <div style={{ height: '3px', borderRadius: '99px', backgroundColor: stat.bg, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: stats.total > 0 ? `${(stat.value / stats.total) * 100}%` : '0%', backgroundColor: stat.color, borderRadius: '99px' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '360px' }}>
        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: '#8b8fa8' }} />
        <input
          type="text"
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '9px 12px 9px 36px', backgroundColor: '#111318',
            border: '1px solid #2d303a', borderRadius: '10px', color: '#fff',
            fontSize: '13px', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #d6006e', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <Users style={{ width: '48px', height: '48px', margin: '0 auto 16px', color: '#2d303a' }} />
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#5b5f70', margin: '0 0 6px' }}>
            {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente ainda'}
          </p>
          <p style={{ fontSize: '13px', color: '#8b8fa8', margin: 0 }}>
            {search ? 'Tente outro termo de busca' : 'Crie sua primeira venda na aba "Minhas Vendas"'}
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid #1e2028' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#111318', borderBottom: '1px solid #2d303a' }}>
                {['Cliente', 'Verificado', 'Setup', 'Assinatura', 'Data'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#8b8fa8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, idx) => (
                <tr key={s.id} style={{ backgroundColor: idx % 2 === 0 ? '#0d0f14' : '#111318', borderBottom: '1px solid #1e2028' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
                        background: 'linear-gradient(135deg, #d6006e22, #9b005422)',
                        border: '1px solid rgba(214,0,110,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', fontWeight: 700, color: '#d6006e',
                      }}>
                        {s.clientName?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{s.clientName}</div>
                        <div style={{ fontSize: '11px', color: '#8b8fa8', marginTop: '1px' }}>{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {s.setupStatus === 'paid'
                      ? <CheckCircle style={{ width: '16px', height: '16px', color: '#22c55e' }} />
                      : <XCircle style={{ width: '16px', height: '16px', color: '#4b5563' }} />
                    }
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '3px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 600,
                      ...( s.setupStatus === 'paid'
                        ? { backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }
                        : s.setupStatus === 'overdue'
                        ? { backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }
                        : { backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }
                      )
                    }}>
                      {s.setupStatus === 'paid' ? 'Pago' : s.setupStatus === 'overdue' ? 'Vencido' : 'Pendente'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '3px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 600,
                      ...( s.subscriptionStatus === 'active'
                        ? { backgroundColor: 'rgba(214,0,110,0.1)', color: '#d6006e', border: '1px solid rgba(214,0,110,0.2)' }
                        : { backgroundColor: 'rgba(107,114,128,0.1)', color: '#9ca3af', border: '1px solid rgba(107,114,128,0.2)' }
                      )
                    }}>
                      {s.subscriptionStatus === 'active' ? 'Ativa' : 'Pendente'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '12px', color: '#8b8fa8' }}>
                    {new Date(s.createdAt).toLocaleDateString('pt-BR')}
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
