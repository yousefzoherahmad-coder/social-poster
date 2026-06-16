import { useState, useEffect } from 'react';
import { api } from '../api/client';
import StatCard from '../components/StatCard';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { UsersIcon, MegaphoneIcon, DocumentTextIcon, TicketIcon, RocketLaunchIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [growth, setGrowth] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [postsTimeline, setPostsTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, growthRes, platformsRes, timelineRes] = await Promise.all([
        api.statsOverview(),
        api.usersGrowth(),
        api.postsByPlatform(),
        api.postsTimeline(),
      ]);
      setStats(statsRes.data);
      setGrowth(growthRes.data.growth.map(g => ({ ...g, date: format(new Date(g.date), 'MMM d') })));
      setPlatforms(platformsRes.data.platforms);
      setPostsTimeline(timelineRes.data.timeline.map(t => ({ ...t, date: format(new Date(t.date), 'MMM d') })));
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Platform overview and analytics</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={stats?.total_users} icon={UsersIcon} color="blue" subtitle={`${stats?.active_users_24h} active today`} />
        <StatCard title="Active Channels" value={stats?.active_channels} icon={MegaphoneIcon} color="green" />
        <StatCard title="Posts Published" value={stats?.published_posts} icon={DocumentTextIcon} color="purple" subtitle={`${stats?.total_posts} total`} />
        <StatCard title="Open Tickets" value={stats?.open_tickets} icon={TicketIcon} color={stats?.open_tickets > 0 ? 'orange' : 'green'} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard title="New Users Today" value={stats?.new_users_today} icon={UserPlusIcon} color="yellow" />
        <StatCard title="Active Users (24h)" value={stats?.active_users_24h} icon={RocketLaunchIcon} color="blue" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User growth */}
        <div className="card">
          <h3 className="text-base font-semibold text-white mb-4">User Growth (30 days)</h3>
          {growth.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#f9fafb' }} />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} name="New Users" />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-sm text-center py-8">No data yet</p>}
        </div>

        {/* Posts by platform */}
        <div className="card">
          <h3 className="text-base font-semibold text-white mb-4">Posts by Platform</h3>
          {platforms.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={platforms} dataKey="count" nameKey="platform" cx="50%" cy="50%" outerRadius={80} label={({ platform, percent }) => `${platform} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {platforms.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-sm text-center py-8">No posts yet</p>}
        </div>

        {/* Posts timeline */}
        <div className="card lg:col-span-2">
          <h3 className="text-base font-semibold text-white mb-4">Publishing Activity (30 days)</h3>
          {postsTimeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={postsTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#f9fafb' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Posts" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-sm text-center py-8">No posts published yet</p>}
        </div>
      </div>
    </div>
  );
}
