import { useState, useEffect } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { MagnifyingGlassIcon, NoSymbolIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [banModal, setBanModal] = useState(null);
  const [banReason, setBanReason] = useState('');

  useEffect(() => { load(); }, [page, filter]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers({ page, limit: 20, search: search || undefined, banned: filter === 'banned' ? true : filter === 'active' ? false : undefined });
      setUsers(res.data.users);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  const handleSearch = (e) => { e.preventDefault(); setPage(1); load(); };

  const handleBan = async () => {
    try {
      await api.banUser(banModal.id, { reason: banReason });
      toast.success('User banned');
      setBanModal(null);
      setBanReason('');
      load();
    } catch { toast.error('Failed to ban user'); }
  };

  const handleUnban = async (id) => {
    try {
      await api.unbanUser(id);
      toast.success('User unbanned');
      load();
    } catch { toast.error('Failed to unban user'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-gray-400 text-sm">{total.toLocaleString()} total users</p>
        </div>
        <div className="flex gap-2">
          {['', 'active', 'banned'].map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(1); }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${filter === f ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {f === '' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search by name or username..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary">Search</button>
      </form>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-800">
              <tr>
                {['User', 'Telegram ID', 'Points', 'Referrals', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-500">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-500">No users found</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-700 rounded-full flex items-center justify-center text-xs font-bold text-white">
                        {u.first_name?.[0] || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-white">{u.first_name} {u.last_name || ''}</p>
                        {u.username && <p className="text-xs text-gray-500">@{u.username}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="table-cell font-mono text-xs">{u.telegram_id}</td>
                  <td className="table-cell font-semibold text-yellow-400">{u.points}</td>
                  <td className="table-cell">{u.referral_count}</td>
                  <td className="table-cell">
                    <span className={u.is_banned ? 'badge-red' : 'badge-green'}>
                      {u.is_banned ? 'Banned' : 'Active'}
                    </span>
                  </td>
                  <td className="table-cell text-xs">{u.joined_at ? format(new Date(u.joined_at), 'MMM d, yyyy') : '—'}</td>
                  <td className="table-cell">
                    {u.is_banned ? (
                      <button onClick={() => handleUnban(u.id)} className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300">
                        <CheckCircleIcon className="w-4 h-4" /> Unban
                      </button>
                    ) : (
                      <button onClick={() => setBanModal(u)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
                        <NoSymbolIcon className="w-4 h-4" /> Ban
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
          <p className="text-sm text-gray-400">Showing {Math.min((page - 1) * 20 + 1, total)}–{Math.min(page * 20, total)} of {total}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50">← Prev</button>
            <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total} className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50">Next →</button>
          </div>
        </div>
      </div>

      <Modal open={!!banModal} onClose={() => setBanModal(null)} title={`Ban ${banModal?.first_name}?`}>
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">This will immediately prevent the user from using the bot.</p>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Reason (optional)</label>
            <input className="input" placeholder="Spam, abuse, etc." value={banReason} onChange={e => setBanReason(e.target.value)} />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setBanModal(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleBan} className="btn-danger">Ban User</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
