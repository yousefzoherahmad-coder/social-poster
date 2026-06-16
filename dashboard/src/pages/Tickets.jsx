import { useState, useEffect } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STATUS_BADGE = { open: 'badge-yellow', closed: 'badge-gray', 'in-progress': 'badge-blue' };
const PRIORITY_BADGE = { low: 'badge-gray', normal: 'badge-blue', high: 'badge-orange', urgent: 'badge-red' };

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('open');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getTickets({ status: filter || undefined });
      setTickets(res.data.tickets); setTotal(res.data.total);
    } catch { toast.error('Failed to load tickets'); }
    finally { setLoading(false); }
  };

  const openTicket = async (t) => {
    try {
      const res = await api.getTicket(t.id);
      setSelected(res.data.ticket); setMessages(res.data.messages);
    } catch { toast.error('Failed to load ticket'); }
  };

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await api.replyTicket(selected.id, { message: reply });
      setReply('');
      const res = await api.getTicket(selected.id);
      setMessages(res.data.messages);
      toast.success('Reply sent');
    } catch { toast.error('Failed to send reply'); }
    finally { setSending(false); }
  };

  const handleStatus = async (status) => {
    try {
      await api.updateTicketStatus(selected.id, { status });
      setSelected(s => ({ ...s, status }));
      toast.success(`Ticket ${status}`);
      load();
    } catch { toast.error('Failed to update status'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Support Tickets</h1><p className="text-gray-400 text-sm">{total} tickets</p></div>
        <div className="flex gap-2">
          {['open', 'in-progress', 'closed', ''].map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors ${filter === s ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-800">
            <tr>{['#', 'User', 'Subject', 'Status', 'Created', 'Action'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? <tr><td colSpan={6} className="text-center py-10 text-gray-500">Loading...</td></tr>
              : tickets.length === 0 ? <tr><td colSpan={6} className="text-center py-10 text-gray-500">No tickets</td></tr>
              : tickets.map(t => (
                <tr key={t.id} className="hover:bg-gray-800/50 cursor-pointer" onClick={() => openTicket(t)}>
                  <td className="table-cell font-mono text-xs">#{t.id}</td>
                  <td className="table-cell text-sm">{t.first_name} {t.last_name || ''} {t.username ? `(@${t.username})` : ''}</td>
                  <td className="table-cell max-w-xs"><p className="truncate">{t.subject}</p></td>
                  <td className="table-cell"><span className={STATUS_BADGE[t.status] || 'badge-gray'}>{t.status}</span></td>
                  <td className="table-cell text-xs">{format(new Date(t.created_at), 'MMM d, yyyy')}</td>
                  <td className="table-cell"><button className="text-primary-400 hover:text-primary-300 text-sm">View →</button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Ticket #${selected?.id} — ${selected?.subject}`} maxWidth="max-w-2xl">
        {selected && (
          <div className="space-y-4">
            <div className="flex gap-2 items-center">
              <span className={STATUS_BADGE[selected.status] || 'badge-gray'}>{selected.status}</span>
              {selected.status !== 'closed' && <button onClick={() => handleStatus('closed')} className="btn-secondary text-xs py-1">Close Ticket</button>}
              {selected.status === 'open' && <button onClick={() => handleStatus('in-progress')} className="btn-primary text-xs py-1">Mark In Progress</button>}
            </div>
            <div className="max-h-64 overflow-y-auto space-y-3 bg-gray-950 rounded-lg p-3">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-sm rounded-xl px-4 py-2.5 text-sm ${m.sender_type === 'admin' ? 'bg-primary-700 text-white' : 'bg-gray-800 text-gray-200'}`}>
                    <p className="text-xs font-semibold mb-1 opacity-70">{m.sender_type === 'admin' ? 'Admin' : selected.first_name}</p>
                    <p>{m.message}</p>
                    <p className="text-xs opacity-50 mt-1">{format(new Date(m.created_at), 'HH:mm')}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="Type a reply..." value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleReply()} />
              <button onClick={handleReply} disabled={sending || !reply.trim()} className="btn-primary">{sending ? '...' : 'Send'}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
