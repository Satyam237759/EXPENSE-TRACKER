import React, { useState, useEffect } from 'react';
import { UserCheck, ShieldCheck, Database, KeyRound, Lock, CheckCircle2, LogOut } from 'lucide-react';
import { User } from '../types.ts';

interface ProfileViewProps {
  currentUser: User | null;
  onUpdateUser: (name: string, email: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onLogout?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onUpdateUser,
  showToast,
  onLogout,
}) => {
  const [name, setName] = useState(currentUser?.name || 'Satyam Nishad');
  const [email, setEmail] = useState(currentUser?.email || 'satyamnishad685@gmail.com');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setEmail(currentUser.email);
    }
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          current_password: currentPassword || undefined,
          new_password: newPassword || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Profile updated successfully', 'success');
        onUpdateUser(name, email);
        setCurrentPassword('');
        setNewPassword('');
      } else {
        showToast(json.error || 'Failed to update profile', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Network error', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* User Card */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900 shadow-sm space-y-6">
        <div className="flex items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 text-white flex items-center justify-center font-extrabold text-xl">
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{name}</h3>
              <p className="text-xs text-slate-400">{email}</p>
              <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Verified SmartSpend Pro User
              </span>
            </div>
          </div>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/15 text-slate-300 hover:text-rose-400 text-xs font-bold transition-all border border-slate-700 hover:border-rose-500/30"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Personal Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm text-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm text-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Security & Password
            </h4>
            <p className="text-[11px] text-slate-500">Leave blank if you do not want to alter credentials.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 text-sm text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow-sm disabled:opacity-50"
            >
              {isSaving ? 'Saving Changes...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Database & Architecture Card */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900 space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-400" />
          <h4 className="text-sm font-bold text-white">Database & Security Architecture</h4>
        </div>
        <ul className="text-xs text-slate-400 space-y-2">
          <li className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>SQLite Storage:</strong> Live records persisted in <code className="text-indigo-300">instance/smartspend.db</code> across all sessions.
            </span>
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Strict User Isolation:</strong> Multi-tenant isolation guarantees each account accesses only their records.
            </span>
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>SQL Injection Immunity:</strong> Parameterized SQL placeholders (<code className="text-emerald-400">?</code>) prevent malicious payloads.
            </span>
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>PBKDF2 Password Hashing:</strong> 100,000 SHA256 iterations with cryptographic per-user salting.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
};
