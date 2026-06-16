import { useState, useEffect } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { PlusIcon, PaperAirplaneIcon, TrashIcon, ClockIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const PLATFORMS = ['x', 'linkedin', 'reddit', 'facebook', 'hacker-news', 'stacker-news', 'primal'];
const STATUS_BADGE = { draft: 'badge-gray', scheduled: 'badge-yellow', publishing: 'badge-blue', published: 'badge-green', failed: 'badge-red' };
const EMPTY_FORM = { content: '', title: '', link: '', platforms: [], scheduled_at: '', tags: '' };

export default function Posts() {
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);

  useEffect(() => { load(); }, [page, statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getPosts({ page, limit: 20, status: statusFilter || undefined });
      setPosts(res.data.posts); setTotal(res.data.total);
    } catch { toast.error('Failed to load posts'); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!form.content.trim()) return toast.error('Content is required');
    if (form.platforms.length === 0 && !form.scheduled_at) return toast.error('Select at least one platform');
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) formData.append(k, Array.isArray(v) ? v.join(',') : v); });
      if (mediaFile) formData.append('media', mediaFile);
      await api.createPost(formData);
      toast.success('Post created successfully');
      setModal(null); setForm(EMPTY_FORM); setMediaFile(null); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create post'); }
    finally { setSaving(false); }
  };

  const handlePublish = async (id) => {
    setPublishing(id);
    try {
      await api.publishPost(id);
      toast.success('Post published successfully!');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Publishing failed'); }
    finally { setPublishing(null); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this post?')) return;
    try { await api.deletePost(id); toast.success('Post deleted'); load(); }
    catch { toast.error('Failed to delete post'); }
  };

  const togglePlatform = (p) => setForm(f => ({
    ...f, platforms: f.platforms.includes(p) ? f.platforms.filter(x => x !== p) : [...f.platforms, p]
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Posts</h1>
          <p className="text-gray-400 text-sm">{total} total posts</p>
        </div>
        <button onClick={() => { setForm(EMPTY_FORM); setModal('create'); }} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Create Post
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'draft', 'scheduled', 'published', 'failed'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-800">
            <tr>{['Content', 'Platforms', 'Status', 'Scheduled', 'Created', 'Actions'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? <tr><td colSpan={6} className="text-center py-10 text-gray-500">Loading...</td></tr>
              : posts.length === 0 ? <tr><td colSpan={6} className="text-center py-10 text-gray-500">No posts found</td></tr>
              : posts.map(p => (
                <tr key={p.id} className="hover:bg-gray-800/50">
                  <td className="table-cell max-w-xs">
                    {p.title && <p className="font-medium text-white text-sm">{p.title}</p>}
                    <p className="text-gray-400 text-xs line-clamp-2">{p.content.slice(0, 80)}...</p>
                  </td>
                  <td className="table-cell"><div className="flex flex-wrap gap-1">{(p.platforms || []).map(pl => <span key={pl} className="badge-blue">{pl}</span>)}</div></td>
                  <td className="table-cell"><span className={STATUS_BADGE[p.status] || 'badge-gray'}>{p.status}</span></td>
                  <td className="table-cell text-xs">{p.scheduled_at ? format(new Date(p.scheduled_at), 'MMM d HH:mm') : '—'}</td>
                  <td className="table-cell text-xs">{format(new Date(p.created_at), 'MMM d, yyyy')}</td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      {['draft', 'failed', 'scheduled'].includes(p.status) && (
                        <button onClick={() => handlePublish(p.id)} disabled={publishing === p.id} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
                          <PaperAirplaneIcon className="w-4 h-4" />{publishing === p.id ? '...' : 'Publish'}
                        </button>
                      )}
                      <button onClick={() => handleDelete(p.id)} className="text-xs text-red-400 hover:text-red-300"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
          <p className="text-sm text-gray-400">{total} posts</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50">← Prev</button>
            <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total} className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50">Next →</button>
          </div>
        </div>
      </div>

      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Create Post" maxWidth="max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Title (optional)</label>
            <input className="input" placeholder="Post title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Content *</label>
            <textarea className="input h-32 resize-none" placeholder="Write your post content..." value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
            <p className="text-xs text-gray-600 mt-1">{form.content.length} characters</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Link (optional)</label>
            <input className="input" placeholder="https://..." value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Platforms *</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button key={p} type="button" onClick={() => togglePlatform(p)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${form.platforms.includes(p) ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1"><ClockIcon className="w-4 h-4 inline mr-1" />Schedule (optional)</label>
            <input type="datetime-local" className="input" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Media Upload (optional)</label>
            <input type="file" accept="image/*,video/*" className="input" onChange={e => setMediaFile(e.target.files[0])} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleCreate} disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create Post'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
