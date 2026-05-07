import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, CheckSquare, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

const statusBadge = {
  todo: { label: 'Todo', cls: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'In Progress', cls: 'bg-blue-50 text-blue-700' },
  done: { label: 'Done', cls: 'bg-emerald-50 text-emerald-700' },
};

const priorityBadge = {
  low: { label: 'Low', cls: 'bg-slate-100 text-slate-500' },
  medium: { label: 'Medium', cls: 'bg-amber-50 text-amber-700' },
  high: { label: 'High', cls: 'bg-red-50 text-red-600' },
};

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([client.get('/tasks'), client.get('/projects')])
      .then(([t, p]) => {
        setTasks(t.data);
        setProjects(p.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const overdue = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done'
  );
  const inProgress = tasks.filter((t) => t.status === 'in_progress');
  const done = tasks.filter((t) => t.status === 'done');

  const recentTasks = [...tasks].slice(0, 8);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
          {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-500 mt-0.5">Here's what's going on with your work.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FolderKanban} label="Projects" value={projects.length} color="bg-brand-50 text-brand-600" />
        <StatCard icon={CheckSquare} label="Total Tasks" value={tasks.length} color="bg-slate-100 text-slate-600" />
        <StatCard icon={Clock} label="In Progress" value={inProgress.length} color="bg-blue-50 text-blue-600" />
        <StatCard icon={AlertCircle} label="Overdue" value={overdue.length} color="bg-red-50 text-red-500" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Recent Tasks</h2>
            <Link to="/tasks" className="text-sm text-brand-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentTasks.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400 text-sm">No tasks yet</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentTasks.map((task) => (
                <div key={task._id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{task.project?.name}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${statusBadge[task.status]?.cls}`}>
                    {statusBadge[task.status]?.label}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${priorityBadge[task.priority]?.cls}`}>
                    {priorityBadge[task.priority]?.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Projects Overview */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Projects</h2>
            <Link to="/projects" className="text-sm text-brand-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {projects.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400 text-sm">No projects yet</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {projects.slice(0, 5).map((p) => {
                const total = Object.values(p.taskCounts || {}).reduce((a, b) => a + b, 0);
                const doneCount = p.taskCounts?.done || 0;
                const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
                return (
                  <Link key={p._id} to={`/projects/${p._id}`} className="block px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                      <span className="text-xs text-slate-400 ml-2">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-brand-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="card border-red-200">
          <div className="px-5 py-4 border-b border-red-100 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <h2 className="font-semibold text-red-700">Overdue Tasks ({overdue.length})</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {overdue.map((task) => (
              <div key={task._id} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                  <p className="text-xs text-slate-400">{task.project?.name} · Due {new Date(task.dueDate).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityBadge[task.priority]?.cls}`}>
                  {priorityBadge[task.priority]?.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
