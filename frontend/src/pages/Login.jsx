import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Lock,
  Mail,
  Users,
  ShieldCheck,
  Briefcase,
} from 'lucide-react';

const ROLE_REDIRECTS = {
  EMPLOYEE: '/employee/dashboard',
  MANAGER: '/manager/dashboard',
  ADMIN: '/admin/dashboard',
};

const AtomQuestLogo = () => (
  <div className="flex items-center gap-3">
    <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
      <div className="absolute w-5 h-5 border border-cyan-400 rounded-full opacity-70" />
      <div className="absolute w-5 h-5 border border-indigo-400 rounded-full rotate-45 opacity-70" />
      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
    </div>

    <div className="flex flex-col">
      <h1 className="text-[1.25rem] font-semibold tracking-tight text-white leading-none">
        AtomQuest
      </h1>

      <span className="text-[11px] text-slate-400 font-medium mt-0.5">
        by Atomberg
      </span>
    </div>
  </div>
);

const DEMO_ACCOUNTS = [
  {
    title: 'Employee',
    subtitle: 'View goals & tasks',
    icon: Briefcase,
    email: 'employee@atomquest.com',
  },
  {
    title: 'Manager',
    subtitle: 'Team oversight',
    icon: Users,
    email: 'manager@atomquest.com',
  },
  {
    title: 'Admin',
    subtitle: 'Full strategic view',
    icon: ShieldCheck,
    email: 'admin@atomquest.com',
  },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: '',
  });

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

  const fillDemo = (email) => {
    setForm({
      email,
      password: 'password123',
    });
  };

  return (
    <div className="min-h-screen bg-[#050F2A] text-white overflow-hidden relative">


      {/* Background Glow */}
      <div className="absolute top-[-120px] left-[-100px] w-[300px] h-[300px] bg-indigo-600/20 blur-3xl rounded-full" />
      <div className="absolute bottom-[-120px] right-[-100px] w-[300px] h-[300px] bg-cyan-500/10 blur-3xl rounded-full" />

      <div className="relative z-10 min-h-screen flex overflow-hidden">
        {/* LEFT SECTION */}
        <div className="hidden lg:flex flex-1 px-10 py-8 flex-col justify-between">
          <div>
            <AtomQuestLogo />

            <div className="mt-14 max-w-xl">
              <h2 className="text-[2.4rem] font-semibold leading-[1.08] tracking-[-0.04em] max-w-[420px]">
                Align every goal to purpose.
              </h2>

              <p className="mt-5 text-[0.9rem] leading-8 text-slate-400 max-w-[520px]">
                The executive-tech platform designed to synchronize team
                focus, track critical performance metrics, and drive
                strategic resources toward measurable outcomes.
              </p>
            </div>
          </div>

          {/* Demo Cards */}
          <div className="mt-8">
            <div className="mb-4">
              <h3 className="text-[1.9rem] font-semibold">
                Quick Access Demos
              </h3>

              <p className="text-slate-400 mt-1 text-[0.9rem]">
                Swipe to browse, tap to login
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-3xl">
              {DEMO_ACCOUNTS.map((account) => {
                const Icon = account.icon;

                return (
                  <button
                    key={account.title}
                    onClick={() => fillDemo(account.email)}
                    className="group bg-white/[0.03] border border-indigo-500/20 rounded-[20px] p-4 text-left hover:border-indigo-500/40 hover:bg-white/[0.05] transition-all duration-300"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
                      <Icon
                        size={18}
                        className="text-indigo-300"
                        strokeWidth={1.8}
                      />
                    </div>

                    <h4 className="text-[1rem] font-semibold text-white">
                      {account.title}
                    </h4>

                    <p className="mt-1 text-[13px] text-slate-400">
                      {account.subtitle}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT SECTION */}
        <div className="w-full lg:w-[460px] flex items-center justify-center px-4 py-5">
          <div className="w-full max-w-[400px] bg-[#0B1637]/95 border border-white/10 backdrop-blur-xl rounded-[28px] p-6 shadow-2xl">
            {/* Top Icon */}
            <div className="flex justify-center mb-5">
              <div className="w-20 h-20 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#0D1635] flex items-center justify-center border border-white/5">
                  <Lock size={20} className="text-indigo-300" />
                </div>
              </div>
            </div>

            {/* Heading */}
            <div className="text-center">
              <h2 className="text-[2.2rem] font-semibold tracking-[-0.04em] leading-none">
                Welcome Back
              </h2>

              <p className="mt-3 text-slate-400 text-[0.9rem]">
                Please enter your details to sign in.
              </p>
            </div>

            {/* FORM */}
            <form
              onSubmit={handleSubmit}
              className="mt-7 space-y-4"
            >
              {/* EMAIL */}
              <div>
                <label className="block text-slate-300 mb-2 text-[13px] font-medium">
                  Work Email
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        email: e.target.value,
                      })
                    }
                    placeholder="name@company.com"
                    className="w-full h-[50px] rounded-xl bg-[#08142F] border border-white/10 pl-11 pr-4 text-[14px] text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <label className="block text-slate-300 mb-2 text-[13px] font-medium">
                  Password
                </label>

                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        password: e.target.value,
                      })
                    }
                    placeholder="••••••••"
                    className="w-full h-[50px] rounded-xl bg-[#08142F] border border-white/10 pl-11 pr-4 text-[14px] text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              {/* OPTIONS */}
              <div className="flex items-center justify-between text-sm pt-1">
                <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded border border-white/20 bg-transparent"
                  />

                  <span className="text-[13px]">
                    Remember me
                  </span>
                </label>

                <button
                  type="button"
                  className="text-indigo-300 hover:text-indigo-200 transition-colors text-[13px]"
                >
                  Forgot password?
                </button>
              </div>

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[50px] rounded-xl bg-[#5B4CF0] hover:bg-[#6A5CF5] transition-all duration-300 text-[0.95rem] font-semibold shadow-lg shadow-indigo-600/20 disabled:opacity-60 mt-2"
              >
                {loading ? 'Signing in...' : 'Sign in to Dashboard'}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-white/10" />

              <span className="text-slate-500 text-xs">
                or
              </span>

              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Microsoft Button */}
            <button className="w-full h-[50px] rounded-xl bg-[#08142F] border border-white/10 hover:bg-[#0B1838] transition-all duration-300 flex items-center justify-center gap-3 text-[0.9rem] font-semibold">
              <div className="grid grid-cols-2 gap-[2px] w-4 h-4">
                <div className="bg-red-500" />
                <div className="bg-green-500" />
                <div className="bg-blue-500" />
                <div className="bg-yellow-400" />
              </div>

              Continue with Microsoft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}