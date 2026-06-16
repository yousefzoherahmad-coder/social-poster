import { useState, useEffect } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

const PLATFORMS = ['x', 'linkedin', 'reddit', 'facebook', 'hacker-news', 'stacker-news', 'primal', 'telegram', 'instagram', 'tiktok'];
const EMPTY = { platform: 'telegram', channel_id: '', channel_name: '', channel_url: '', description: '', is_force_sub: false };

export default function Channels() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { const res = await api.getChannels(); setChannels(res.data.channels); }
    catch { toast.error('Failed to load channels'); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setForm(EMPTY); setModal('create'); };
  const openEdit = (ch) => { setForm({ ...ch }); setModal('edit'); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (modal === 'create') { await api.createChannel(form); toast.success('Channel created'); }
      else { await api.updateChannel(form.id, form); toast.success('Channel updated'); }
      setModal(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this channel?')) return;
    try { await api.deleteChannel(id); toast.success('Channel deleted'); load(); }
    catch { toast.error('Failed to delete channel'); }
  };

  const f = (key) => ({ value: form[key] || '', onChange: (e) => setForm(p => ({ ...p, [key]: e.target.value })) });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Channels</h1>
          <p className="text-gray-400 text-sm">{channels.length} channels configured</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Add Channel
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : channels.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400">No channels yet.</p>
          <button onClick={openCreate} className="btn-primary mt-4">Add your first channel</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels.map(ch => (
            <div key={ch.id} className="card hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="badge-blue">{ch.platform}</span>
                  {ch.is_force_sub && <span className="badge-yellow">Force Sub</span>}
                  <span className={ch.is_active ? 'badge-green' : 'badge-gray'}>{ch.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(ch)} className="text-gray-400 hover:text-white"><PencilIcon className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(ch.id)} className="text-gray-400 hover:text-red-400"><TrashIcon className="w-4 h-4" /></button>
                </div>
              </div>
              <h3 className="font-semibold text-white">{ch.channel_name}</h3>
              {ch.channel_url && <a href={ch.channel_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-400 hover:underline mt-1 block truncate">{ch.channel_url}</a>}
              {ch.description && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{ch.description}</p>}
              <p className="text-xs text-gray-600 mt-3">Posts: {ch.post_count}</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Channel' : 'Edit Channel'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Platform</label>
            <select className="input" value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))}>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Channel Name *</label>
            <input className="input" placeholder="My Channel" {...f('channel_name')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Channel ID / Handle</label>
            <input className="input" placeholder="@username or ID" {...f('channel_id')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">URL</label>
            <input className="input" placeholder="https://..." {...f('channel_url')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
            <textarea className="input h-20 resize-none" {...f('description')} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-primary-500" checked={!!form.is_force_sub} onChange={e => setForm(p => ({ ...p, is_force_sub: e.target.checked }))} />
            <span className="text-sm text-gray-300">Force subscribe (require users to join)</span>
          </label>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Channel'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
