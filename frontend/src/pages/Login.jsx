import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import toast, { Toaster } from 'react-hot-toast';
import { Sun, Moon, KeyRound } from 'lucide-react';

const ROLE_REDIRECTS = {
  EMPLOYEE: '/employee/dashboard',
  MANAGER: '/manager/dashboard',
  ADMIN: '/admin/dashboard',
};

const AtombergLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-10 w-10 text-[var(--success-text)] transition-transform duration-300 hover:rotate-45">
    {/* Atomic Nucleus */}
    <circle cx="12" cy="12" r="2.5" fill="currentColor" className="text-[var(--success-text)]" />
    {/* Orbital paths */}
    <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(30 12 12)" stroke="currentColor" strokeWidth="1.2" className="opacity-80" />
    <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(150 12 12)" stroke="currentColor" strokeWidth="1.2" className="opacity-80" />
    <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(90 12 12)" stroke="currentColor" strokeWidth="1.2" className="opacity-40" />
  </svg>
);

export default function Login() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(ROLE_REDIRECTS[user.role] || '/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-root)] flex items-center justify-center p-4 relative transition-colors duration-200">
      <Toaster position="top-right" toastOptions={{ className: 'toast-dark' }} />
      
      {/* Floating Theme Selector top-right */}
      <div className="absolute top-6 right-6">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-150 flex items-center justify-center cursor-pointer"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon size={16} strokeWidth={1.8} /> : <Sun size={16} strokeWidth={1.8} />}
        </button>
      </div>

      {/* Login Card Panel */}
      <div className="aq-card w-full max-w-md p-8 transition-transform duration-200">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-start">
            <AtombergLogo />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Atomberg</h1>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold mt-1.5">
            Goal Setting & Tracking Portal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Email address
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="aq-input w-full px-4 py-2.5 focus:outline-none"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="aq-input w-full px-4 py-2.5 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-confirm py-2.5 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Quick-login hint for demo/hackathon judges */}
        <div className="mt-8 p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]">
          <div className="flex items-center gap-2 mb-3">
            <KeyRound size={13} className="text-[var(--text-muted)]" />
            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Demo credentials
            </span>
          </div>
          <div className="space-y-1.5 text-xs text-[var(--text-secondary)] mono">
            <div className="flex justify-between">
              <span>Employee:</span>
              <span className="text-[var(--text-primary)]">employee@atomquest.com</span>
            </div>
            <div className="flex justify-between">
              <span>Manager:</span>
              <span className="text-[var(--text-primary)]">manager@atomquest.com</span>
            </div>
            <div className="flex justify-between">
              <span>Admin:</span>
              <span className="text-[var(--text-primary)]">admin@atomquest.com</span>
            </div>
            <div className="pt-1.5 border-t border-[var(--border)] mt-1.5 flex justify-between text-[var(--text-muted)]">
              <span>Password:</span>
              <span className="text-[var(--text-primary)] font-medium">password123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}