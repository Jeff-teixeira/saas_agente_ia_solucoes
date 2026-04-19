import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Github, Mail, KeyRound, Fingerprint } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBranding } from '../../contexts/BrandingContext';
import { authApi } from '../../api/client';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" />
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, mfaPending, completeMfaChallenge, clearMfaPending } = useAuth();
  const { branding } = useBranding();
  const [form, setForm] = useState({ email: '', password: '' });
  const [mfaCode, setMfaCode] = useState('');
  const [magicLinkEmail, setMagicLinkEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const providers = branding.authProviders;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      // Redireciona admin para /last, clientes para /dashboard
      const isAdmin = form.email.toLowerCase().includes('admin');
      navigate(isAdmin ? '/last' : '/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Email ou senha inválidos');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaPending) return;
    setError('');
    setLoading(true);
    try {
      await completeMfaChallenge(mfaPending.mfaToken, mfaCode);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Código de verificação inválido');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.requestMagicLink(magicLinkEmail);
      setMagicLinkSent(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Falha ao enviar magic link');
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const options = await authApi.passkeyLoginBegin();
      const credential = await navigator.credentials.get({ publicKey: options });
      if (!credential) throw new Error('No credential returned');
      const data = await authApi.passkeyLoginFinish(credential);
      localStorage.setItem('lastsaas_access_token', data.accessToken);
      localStorage.setItem('lastsaas_refresh_token', data.refreshToken);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || (err as Error)?.message || 'Falha na autenticação por passkey';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const heading = branding.loginHeading || 'Bem-vindo de volta';
  const subtext = branding.loginSubtext || 'Entre na sua conta';

  const hasOAuth = providers && (providers.google || providers.github || providers.microsoft);

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: '#fafafa',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    color: '#1a1a1a',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.15s',
  };

  const btnPrimary = {
    width: '100%',
    padding: '11px 16px',
    backgroundColor: '#d6006e',
    color: '#ffffff',
    fontWeight: '500' as const,
    fontSize: '14px',
    borderRadius: '8px',
    border: 'none',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    transition: 'background-color 0.15s',
  };

  // MFA challenge screen
  if (mfaPending) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#f5f5f7' }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(214,0,110,0.1)' }}>
              <KeyRound className="w-6 h-6" style={{ color: '#d6006e' }} />
            </div>
            <h1 className="text-2xl font-semibold" style={{ color: '#1a1a1a' }}>Autenticação em 2 fatores</h1>
            <p className="mt-2 text-sm" style={{ color: '#8a8a8a' }}>Insira o código do seu autenticador</p>
          </div>

          <form onSubmit={handleMfaSubmit} className="space-y-4" style={{ backgroundColor: '#ffffff', border: '1px solid #e8e8e8', borderRadius: '12px', padding: '24px' }}>
            {error && (
              <div style={{ backgroundColor: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '8px', padding: '10px 14px', color: '#dc2626', fontSize: '13px' }}>
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#555555' }}>Código de verificação</label>
              <input type="text" required autoFocus autoComplete="one-time-code" inputMode="numeric" value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)} style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.2em', fontSize: '18px' }} placeholder="000000" maxLength={32} />
            </div>
            <button type="submit" disabled={loading} style={btnPrimary}>{loading ? 'Verificando...' : 'Verificar'}</button>
            <button type="button" onClick={clearMfaPending} className="w-full text-sm transition-colors" style={{ color: '#8a8a8a', background: 'none', border: 'none', cursor: 'pointer' }}>
              Voltar ao login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Magic link form
  if (showMagicLink) {
    if (magicLinkSent) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#f5f5f7' }}>
          <div className="w-full max-w-sm">
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e8e8e8', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(22,163,74,0.1)' }}>
                <Mail className="w-6 h-6" style={{ color: '#16a34a' }} />
              </div>
              <h1 className="text-xl font-semibold mb-2" style={{ color: '#1a1a1a' }}>Verifique seu email</h1>
              <p className="text-sm mb-6" style={{ color: '#8a8a8a' }}>
                Enviamos um link para <span style={{ color: '#1a1a1a', fontWeight: 500 }}>{magicLinkEmail}</span>
              </p>
              <button onClick={() => { setShowMagicLink(false); setMagicLinkSent(false); }}
                className="text-sm transition-colors" style={{ color: '#d6006e', background: 'none', border: 'none', cursor: 'pointer' }}>
                Voltar ao login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#f5f5f7' }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(214,0,110,0.1)' }}>
              <Mail className="w-6 h-6" style={{ color: '#d6006e' }} />
            </div>
            <h1 className="text-2xl font-semibold" style={{ color: '#1a1a1a' }}>Entrar por email</h1>
            <p className="mt-2 text-sm" style={{ color: '#8a8a8a' }}>Enviaremos um link de acesso</p>
          </div>
          <form onSubmit={handleMagicLink} className="space-y-4" style={{ backgroundColor: '#ffffff', border: '1px solid #e8e8e8', borderRadius: '12px', padding: '24px' }}>
            {error && (
              <div style={{ backgroundColor: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '8px', padding: '10px 14px', color: '#dc2626', fontSize: '13px' }}>{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#555555' }}>Email</label>
              <input type="email" required autoFocus value={magicLinkEmail} onChange={(e) => setMagicLinkEmail(e.target.value)} style={inputStyle} placeholder="voce@exemplo.com" />
            </div>
            <button type="submit" disabled={loading} style={btnPrimary}>{loading ? 'Enviando...' : 'Enviar link de acesso'}</button>
            <button type="button" onClick={() => setShowMagicLink(false)} className="w-full text-sm" style={{ color: '#8a8a8a', background: 'none', border: 'none', cursor: 'pointer' }}>
              Voltar ao login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main login form
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#f5f5f7' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2.5 mb-5">
            <img
              src="/logo.png"
              alt="Agente IA"
              className="h-10 w-auto object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <span className="text-2xl font-semibold tracking-tight">
              <span style={{ color: '#d6006e' }}>Agente</span>
              <span style={{ color: '#8a8a8a' }}> IA</span>
            </span>
          </div>
          <h1 className="text-xl font-semibold" style={{ color: '#1a1a1a' }}>{heading}</h1>
          <p className="mt-1 text-sm" style={{ color: '#8a8a8a' }}>{subtext}</p>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e8e8e8', borderRadius: '12px', padding: '24px' }} className="space-y-4">
          {error && (
            <div style={{ backgroundColor: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '8px', padding: '10px 14px', color: '#dc2626', fontSize: '13px' }}>
              {error}
            </div>
          )}

          {/* OAuth buttons */}
          {hasOAuth && (
            <>
              <div className="space-y-2">
                {providers?.google && (
                  <a href="/api/auth/google" className="flex items-center justify-center gap-3 w-full py-2.5 px-4 text-sm font-medium transition-all"
                    style={{ backgroundColor: '#fafafa', border: '1px solid #e0e0e0', borderRadius: '8px', color: '#333333', textDecoration: 'none' }}>
                    <GoogleIcon className="w-4 h-4" />
                    Continuar com Google
                  </a>
                )}
                {providers?.github && (
                  <a href="/api/auth/github" className="flex items-center justify-center gap-3 w-full py-2.5 px-4 text-sm font-medium transition-all"
                    style={{ backgroundColor: '#fafafa', border: '1px solid #e0e0e0', borderRadius: '8px', color: '#333333', textDecoration: 'none' }}>
                    <Github className="w-4 h-4" />
                    Continuar com GitHub
                  </a>
                )}
                {providers?.microsoft && (
                  <a href="/api/auth/microsoft" className="flex items-center justify-center gap-3 w-full py-2.5 px-4 text-sm font-medium transition-all"
                    style={{ backgroundColor: '#fafafa', border: '1px solid #e0e0e0', borderRadius: '8px', color: '#333333', textDecoration: 'none' }}>
                    <MicrosoftIcon className="w-4 h-4" />
                    Continuar com Microsoft
                  </a>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full" style={{ borderTop: '1px solid #e8e8e8' }} />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3" style={{ backgroundColor: '#ffffff', color: '#a8a8a8' }}>ou</span>
                </div>
              </div>
            </>
          )}

          {/* Passkey button */}
          {providers?.passkeys && (
            <button type="button" onClick={handlePasskeyLogin} disabled={loading}
              className="flex items-center justify-center gap-3 w-full py-2.5 px-4 text-sm font-medium transition-all"
              style={{ backgroundColor: '#fafafa', border: '1px solid #e0e0e0', borderRadius: '8px', color: '#333333', cursor: 'pointer' }}>
              <Fingerprint className="w-4 h-4" />
              Entrar com passkey
            </button>
          )}

          {/* Password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#555555' }}>Email</label>
              <input type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={inputStyle} placeholder="voce@exemplo.com" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#555555' }}>Senha</label>
              <input type="password" required value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                style={inputStyle} placeholder="Sua senha" />
            </div>
            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-sm transition-colors" style={{ color: '#d6006e', textDecoration: 'none' }}>
                Esqueceu a senha?
              </Link>
            </div>
            <button type="submit" disabled={loading} style={btnPrimary}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* Magic link option */}
          {providers?.magicLink && (
            <button type="button" onClick={() => setShowMagicLink(true)}
              className="flex items-center justify-center gap-2 w-full text-sm transition-colors"
              style={{ color: '#8a8a8a', background: 'none', border: 'none', cursor: 'pointer' }}>
              <Mail className="w-4 h-4" />
              Entrar com link por email
            </button>
          )}

          <div className="text-center text-sm" style={{ color: '#8a8a8a' }}>
            Não tem uma conta?{' '}
            <Link to="/signup" className="font-medium transition-colors" style={{ color: '#d6006e', textDecoration: 'none' }}>
              Criar conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
