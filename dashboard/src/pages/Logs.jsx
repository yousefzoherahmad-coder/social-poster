import { useState, useEffect } from 'react';
import { api } from '../api/client';
import toast from 'react-hot-toast';
import { ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const LEVEL_BADGE = { error: 'badge-red', warn: 'badge-yellow', info: 'badge-blue', debug: 'badge-gray' };
const LEVEL_COLOR = { error: 'text-red-400', warn: 'text-yellow-400', info: 'text-blue-400', debug: 'text-gray-400' };

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [level, setLevel] = useState('');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => { load(); }, [level]);
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [autoRefresh, level]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getLogs({ level: level || undefined, limit: 200 });
      setLogs(res.data.logs); setTotal(res.data.total);
    } catch { toast.error('Failed to load logs'); }
    finally { setLoading(false); }
  };

  const handleClear = async () => {
    if (!confirm('Clear logs older than 30 days?')) return;
    try { await api.clearLogs({ older_than_days: 30 }); toast.success('Old logs cleared'); load(); }
    catch { toast.error('Failed to clear logs'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-white">System Logs</h1><p className="text-gray-400 text-sm">{total} log entries</p></div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={load} className="btn-secondary flex items-center gap-1 text-sm"><ArrowPathIcon className="w-4 h-4" />Refresh</button>
          <label className="flex items-center gap-2 cursor-pointer bg-gray-800 px-3 py-2 rounded-lg text-sm text-gray-300">
            <input type="checkbox" className="accent-primary-500" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
            Auto (5s)
          </label>
          <button onClick={handleClear} className="btn-secondary text-sm flex items-center gap-1"><TrashIcon className="w-4 h-4" />Clear Old</button>
        </div>
      </div>

      <div className="flex gap-2">
        {['', 'error', 'warn', 'info', 'debug'].map(l => (
          <button key={l} onClick={() => setLevel(l)} className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors ${level === l ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            {l || 'All'}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          {loading && logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No logs found</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-800 bg-gray-900">
                <tr>
                  {['Time', 'Level', 'Service', 'Message'].map(h => <th key={h} className="table-header">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50 font-mono">
                {logs.map(l => (
                  <tr key={l.id} className="hover:bg-gray-800/30">
                    <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">{format(new Date(l.created_at), 'MM-dd HH:mm:ss')}</td>
                    <td className="px-4 py-2"><span className={LEVEL_BADGE[l.level] || 'badge-gray'}>{l.level}</span></td>
                    <td className="px-4 py-2 text-xs text-gray-500">{l.service || 'app'}</td>
                    <td className="px-4 py-2 text-xs text-gray-300 max-w-xl">{l.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
