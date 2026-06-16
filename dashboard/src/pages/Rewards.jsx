import { useState, useEffect } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

const EMPTY = { name: '', description: '', reward_type: 'manual', points_value: 0, max_claims: '', expires_at: '' };

export default function Rewards() {
  const [rewards, setRewards] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [rwRes, lbRes] = await Promise.all([api.getRewards(), api.getLeaderboard()]);
      setRewards(rwRes.data.rewards); setLeaderboard(lbRes.data.leaderboard);
    } catch { toast.error('Failed to load rewards'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (modal === 'create') { await api.createReward(form); toast.success('Reward created'); }
      else { await api.updateReward(form.id, form); toast.success('Reward updated'); }
      setModal(null); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this reward?')) return;
    try { await api.deleteReward(id); toast.success('Reward deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const f = (key, type = 'text') => ({
    value: form[key] ?? '',
    onChange: (e) => setForm(p => ({ ...p, [key]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Rewards</h1><p className="text-gray-400 text-sm">{rewards.length} rewards configured</p></div>
        <button onClick={() => { setForm(EMPTY); setModal('create'); }} className="btn-primary flex items-center gap-2"><PlusIcon className="w-4 h-4" />Add Reward</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rewards list */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? <div className="text-center py-8 text-gray-500">Loading...</div>
            : rewards.length === 0 ? <div className="card text-center py-8"><p className="text-gray-400">No rewards yet.</p></div>
            : rewards.map(r => (
              <div key={r.id} className="card hover:border-gray-700 transition-colors flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white">{r.name}</h3>
                    <span className={r.is_active ? 'badge-green' : 'badge-gray'}>{r.is_active ? 'Active' : 'Inactive'}</span>
                    <span className="badge-blue">{r.reward_type}</span>
                  </div>
                  <p className="text-sm text-gray-400">{r.description}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>💰 {r.points_value} pts</span>
                    {r.max_claims && <span>Max: {r.max_claims}</span>}
                    <span>Claims: {r.claim_count}</span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={() => { setForm({ ...r }); setModal('edit'); }} className="text-gray-400 hover:text-white"><PencilIcon className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(r.id)} className="text-gray-400 hover:text-red-400"><TrashIcon className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
        </div>

        {/* Leaderboard */}
        <div className="card">
          <h3 className="text-base font-semibold text-white mb-4">🏆 Leaderboard</h3>
          <div className="space-y-2">
            {leaderboard.slice(0, 15).map((u, i) => (
              <div key={u.id} className="flex items-center gap-3">
                <span className={`text-sm font-bold w-5 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-600'}`}>#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{u.first_name} {u.last_name || ''}</p>
                  {u.username && <p className="text-xs text-gray-500">@{u.username}</p>}
                </div>
                <span className="text-sm font-semibold text-yellow-400">{u.points}</span>
              </div>
            ))}
            {leaderboard.length === 0 && <p className="text-gray-500 text-sm">No users yet</p>}
          </div>
        </div>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Create Reward' : 'Edit Reward'}>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-400 mb-1">Name *</label><input className="input" placeholder="Reward name" {...f('name')} /></div>
          <div><label className="block text-sm font-medium text-gray-400 mb-1">Description</label><textarea className="input h-20 resize-none" {...f('description')} /></div>
          <div><label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
            <select className="input" {...f('reward_type')}>
              {['manual', 'referral', 'daily_bonus', 'achievement'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium text-gray-400 mb-1">Points Value</label><input type="number" className="input" min="0" {...f('points_value', 'number')} /></div>
          <div><label className="block text-sm font-medium text-gray-400 mb-1">Max Claims (optional)</label><input type="number" className="input" min="1" {...f('max_claims', 'number')} /></div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
