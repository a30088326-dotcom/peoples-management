import { useState, useEffect } from 'react';
import { Eye, EyeOff, Building2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const { login, loginWithToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authToken = params.get('auth_token');
    if (authToken) {
      setLoading(true);
      loginWithToken(authToken)
        .then(() => {
          onLoginSuccess();
        })
        .catch(() => {
          setError('Magic link expired or invalid. Please log in manually.');
          setLoading(false);
          // Remove the token from URL
          window.history.replaceState({}, '', '/login');
        });
    }
  }, [loginWithToken, onLoginSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      onLoginSuccess();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message ?? 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ambient-bg min-h-screen flex items-center justify-center p-6">
      <div style={{ maxWidth: 440, width: '100%' }}>

        {/* Logo */}
        <div className="text-center mb-8 anim-fade-up">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)', boxShadow: '0 8px 32px rgba(37,99,235,0.3)' }}>
            <Building2 size={28} color="white" />
          </div>
          <h1 className="text-2xl font-black" style={{ color: '#0f172a', letterSpacing: '-0.03em' }}>
            Peoples HR
          </h1>
          <p className="text-sm text-slate-400 mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="card anim-fade-up delay-100" style={{ padding: '2.5rem' }}>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 p-3 rounded-xl anim-scale-in"
                style={{ background: '#fee2e2', border: '1px solid #fecaca' }}>
                <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="input-label">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  className="input-field"
                  placeholder="Enter your email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(p => !p)}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary btn-primary-pulse w-full flex items-center justify-center gap-2 mt-2"
              style={{ padding: '0.875rem', fontSize: '0.9rem' }}
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Signing in...</>
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>

        </div>

        <p className="text-center text-xs text-slate-400 mt-8 font-medium">
          Peoples HR Onboarding Platform &middot; Secured with JWT
        </p>
      </div>
    </div>
  );
}
