import { useState, useEffect } from 'react';
import { api } from '../api/client';
import toast from 'react-hot-toast';

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });
  const [changingPw, setChangingPw] = useState(false);
  const [platformStatus, setPlatformStatus] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [sRes, pRes] = await Promise.all([api.getSettings(), api.getPlatformStatus()]);
      const flat = {};
      Object.values(sRes.data.settings).forEach(cat => Object.assign(flat, cat));
      setSettings(flat); setPlatformStatus(pRes.data);
    } catch { toast.error('Failed to load settings'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try { await api.updateSettings({ settings }); toast.success('Settings saved'); }
    catch { toast.error('Failed to save settings'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (password.next !== password.confirm) return toast.error('Passwords do not match');
    if (password.next.length < 6) return toast.error('Password must be at least 6 characters');
    setChangingPw(true);
    try { await api.changePassword({ currentPassword: password.current, newPassword: password.next }); toast.success('Password changed'); setPassword({ current: '', next: '', confirm: '' }); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed to change password'); }
    finally { setChangingPw(false); }
  };

  const Section = ({ title, children }) => (
    <div className="card space-y-4">
      <h3 className="text-base font-semibold text-white border-b border-gray-800 pb-3">{title}</h3>
      {children}
    </div>
  );

  const Field = ({ label, k, type = 'text', placeholder }) => (
    <div>
      <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
      {type === 'checkbox' ? (
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-primary-500" checked={settings[k] === 'true'} onChange={e => setSettings(s => ({ ...s, [k]: String(e.target.checked) }))} />
          <span className="text-sm text-gray-300">Enabled</span>
        </label>
      ) : (
        <input type={type} className="input" placeholder={placeholder} value={settings[k] || ''} onChange={e => setSettings(s => ({ ...s, [k]: e.target.value }))} />
      )}
    </div>
  );

  if (loading) return <div className="text-center py-12 text-gray-500">Loading settings...</div>;

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <div><h1 className="text-2xl font-bold text-white">Settings</h1><p className="text-gray-400 text-sm">Configure your platform</p></div>

      <Section title="🤖 Bot Settings">
        <Field label="Bot Name" k="bot_name" placeholder="SocialPosterBot" />
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Welcome Message</label>
          <textarea className="input h-24 resize-none" value={settings.bot_welcome_message || ''} onChange={e => setSettings(s => ({ ...s, bot_welcome_message: e.target.value }))} placeholder="Welcome to our bot!" />
        </div>
        <Field label="Force Subscribe" k="force_subscribe" type="checkbox" />
        <Field label="Maintenance Mode" k="maintenance_mode" type="checkbox" />
      </Section>

      <Section title="🎁 Rewards Settings">
        <Field label="Referral Points" k="referral_points" type="number" placeholder="50" />
        <Field label="Daily Bonus Points" k="daily_bonus_points" type="number" placeholder="10" />
        <Field label="Max Daily Streak Bonus" k="max_daily_streak" type="number" placeholder="30" />
      </Section>

      <Section title="📝 Posting Settings">
        <Field label="Max Post Length" k="max_post_length" type="number" placeholder="4096" />
        <Field label="Allow Media Uploads" k="allow_media_uploads" type="checkbox" />
      </Section>

      <Section title="🔒 Security Settings">
        <Field label="Rate Limit (requests/minute)" k="rate_limit_per_minute" type="number" placeholder="60" />
      </Section>

      {/* Platform status */}
      {platformStatus && (
        <Section title="🌐 Social Poster — Platform Status">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {platformStatus.platforms.map(p => (
              <div key={p} className="bg-gray-800 rounded-lg px-3 py-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-sm text-gray-300">{p}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">Use <code className="bg-gray-800 px-1 rounded">node bin/social-poster.js login &lt;platform&gt;</code> to authenticate platforms</p>
        </Section>
      )}

      <button onClick={handleSave} disabled={saving} className="btn-primary px-8">{saving ? 'Saving...' : 'Save All Settings'}</button>

      {/* Change password */}
      <Section title="🔑 Change Admin Password">
        <div><label className="block text-sm font-medium text-gray-400 mb-1">Current Password</label><input type="password" className="input" value={password.current} onChange={e => setPassword(p => ({ ...p, current: e.target.value }))} /></div>
        <div><label className="block text-sm font-medium text-gray-400 mb-1">New Password</label><input type="password" className="input" value={password.next} onChange={e => setPassword(p => ({ ...p, next: e.target.value }))} /></div>
        <div><label className="block text-sm font-medium text-gray-400 mb-1">Confirm Password</label><input type="password" className="input" value={password.confirm} onChange={e => setPassword(p => ({ ...p, confirm: e.target.value }))} /></div>
        <button onClick={handleChangePassword} disabled={changingPw} className="btn-primary">{changingPw ? 'Changing...' : 'Change Password'}</button>
      </Section>
    </div>
  );
}
