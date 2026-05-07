import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, CheckSquare, ArrowRight, FolderKanban } from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const statusConfig = {
  active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  completed: { label: 'Completed', cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
  on_hold: { label: 'On Hold', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
};

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', status: 'active' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    client.get('/projects').then((r) => setProjects(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await client.post('/projects', form);
      setModal(false);
      setForm({ name: '', description: '', status: 'active' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500 mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        {user?.role === 'admin' && (
          <button onClick={() => setModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> New Project
          </button>
        )}
      </div>

      {/* Grid */}
      {projects.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No projects yet</p>
          {user?.role === 'admin' && (
            <p className="text-sm text-slate-400 mt-1">Create your first project to get started.</p>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => {
            const total = Object.values(p.taskCounts || {}).reduce((a, b) => a + b, 0);
            const doneCount = p.taskCounts?.done || 0;
            const inProgress = p.taskCounts?.in_progress || 0;
            const todo = p.taskCounts?.todo || 0;
            const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

            return (
              <Link key={p._id} to={`/projects/${p._id}`} className="card p-5 hover:shadow-md hover:border-slate-300 transition-all group block">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                    <FolderKanban className="w-5 h-5 text-brand-600" />
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusConfig[p.status]?.cls}`}>
                    {statusConfig[p.status]?.label}
                  </span>
                </div>

                <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-brand-600 transition-colors">{p.name}</h3>
                <p className="text-sm text-slate-500 line-clamp-2 mb-4 min-h-[2.5rem]">
                  {p.description || 'No description'}
                </p>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{doneCount} of {total} done</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-brand-600 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {p.members?.length || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckSquare className="w-3.5 h-3.5" /> {total}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title="New Project">
        {error && (
          <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Project Name</label>
            <input className="input" placeholder="e.g. Website Redesign" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={3} placeholder="What is this project about?"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
