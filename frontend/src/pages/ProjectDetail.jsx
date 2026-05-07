import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, UserPlus, UserMinus, Settings, CheckSquare,
  Clock, AlertCircle, ChevronDown,
} from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const statusConfig = {
  todo: { label: 'Todo', cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  in_progress: { label: 'In Progress', cls: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  done: { label: 'Done', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
};

const priorityConfig = {
  low: { label: 'Low', cls: 'bg-slate-100 text-slate-500' },
  medium: { label: 'Medium', cls: 'bg-amber-50 text-amber-700' },
  high: { label: 'High', cls: 'bg-red-50 text-red-600' },
};

function Avatar({ name, size = 'sm' }) {
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  return (
    <div className={`${sizeClass} rounded-full bg-brand-600 text-white flex items-center justify-center font-semibold flex-shrink-0`}>
      {initials}
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('tasks');

  const [taskModal, setTaskModal] = useState(false);
  const [editProjectModal, setEditProjectModal] = useState(false);
  const [addMemberModal, setAddMemberModal] = useState(false);

  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', assigneeId: '', dueDate: '' });
  const [projectForm, setProjectForm] = useState({ name: '', description: '', status: 'active' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [statusDropdown, setStatusDropdown] = useState(null);

  const isOwner = project?.owner?._id === user?._id || project?.owner?.equals?.(user?._id);

  const load = async () => {
    try {
      const [proj, taskRes] = await Promise.all([
        client.get(`/projects/${id}`),
        client.get(`/projects/${id}/tasks`),
      ]);
      setProject(proj.data);
      setTasks(taskRes.data);
      setProjectForm({ name: proj.data.name, description: proj.data.description, status: proj.data.status });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    if (addMemberModal) client.get('/users').then((r) => setAllUsers(r.data));
  }, [addMemberModal]);

  const createTask = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await client.post('/tasks', { ...taskForm, projectId: id });
      setTaskModal(false);
      setTaskForm({ title: '', description: '', priority: 'medium', assigneeId: '', dueDate: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    await client.put(`/tasks/${taskId}`, { status });
    setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status } : t)));
    setStatusDropdown(null);
  };

  const deleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    await client.delete(`/tasks/${taskId}`);
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
  };

  const updateProject = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await client.put(`/projects/${id}`, projectForm);
      setProject(data);
      setEditProjectModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async () => {
    if (!confirm('Delete this project and all its tasks?')) return;
    await client.delete(`/projects/${id}`);
    navigate('/projects');
  };

  const addMember = async (userId) => {
    try {
      await client.post(`/projects/${id}/members`, { userId });
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  const removeMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    await client.delete(`/projects/${id}/members/${userId}`);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) return <div className="p-6 text-slate-500">Project not found.</div>;

  const columns = ['todo', 'in_progress', 'done'];
  const nonMembers = allUsers.filter((u) => !project.members.some((m) => m._id === u._id));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Back + Header */}
      <button onClick={() => navigate('/projects')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Projects
      </button>

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
              project.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              project.status === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
              'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {project.status.replace('_', ' ')}
            </span>
          </div>
          {project.description && <p className="text-slate-500 mt-1 text-sm">{project.description}</p>}
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <button onClick={() => setEditProjectModal(true)} className="btn-secondary">
              <Settings className="w-4 h-4" /> Edit
            </button>
            <button onClick={deleteProject} className="btn-danger">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {['tasks', 'members'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t} {t === 'tasks' && `(${tasks.length})`}
            {t === 'members' && `(${project.members.length})`}
          </button>
        ))}
      </div>

      {/* Tasks Tab */}
      {tab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setTaskModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </div>

          {/* Kanban Columns */}
          <div className="grid md:grid-cols-3 gap-4">
            {columns.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col);
              return (
                <div key={col} className="bg-slate-100 rounded-xl p-3 space-y-2 min-h-[200px]">
                  <div className="flex items-center gap-2 px-1 py-1">
                    <span className={`w-2 h-2 rounded-full ${statusConfig[col].dot}`} />
                    <span className="text-sm font-semibold text-slate-700">{statusConfig[col].label}</span>
                    <span className="ml-auto text-xs font-medium text-slate-400 bg-slate-200 rounded-full px-2 py-0.5">
                      {colTasks.length}
                    </span>
                  </div>

                  {colTasks.map((task) => (
                    <div key={task._id} className="card p-3.5 space-y-2.5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium leading-snug ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {task.title}
                        </p>
                        <button onClick={() => deleteTask(task._id)} className="p-1 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {task.description && (
                        <p className="text-xs text-slate-400 line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${priorityConfig[task.priority]?.cls}`}>
                          {priorityConfig[task.priority]?.label}
                        </span>
                        {task.dueDate && (
                          <span className={`text-xs flex items-center gap-1 ${
                            new Date(task.dueDate) < new Date() && task.status !== 'done'
                              ? 'text-red-500' : 'text-slate-400'
                          }`}>
                            <Clock className="w-3 h-3" />
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-0.5">
                        {task.assignee ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar name={task.assignee.name} />
                            <span className="text-xs text-slate-500">{task.assignee.name.split(' ')[0]}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">Unassigned</span>
                        )}

                        {/* Status change dropdown */}
                        <div className="relative">
                          <button
                            onClick={() => setStatusDropdown(statusDropdown === task._id ? null : task._id)}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                          >
                            Move <ChevronDown className="w-3 h-3" />
                          </button>
                          {statusDropdown === task._id && (
                            <div className="absolute right-0 bottom-full mb-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 py-1 w-32">
                              {columns.filter((c) => c !== col).map((c) => (
                                <button
                                  key={c}
                                  onClick={() => updateTaskStatus(task._id, c)}
                                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                  {statusConfig[c].label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {colTasks.length === 0 && (
                    <div className="text-center py-6 text-xs text-slate-400">Empty</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Members Tab */}
      {tab === 'members' && (
        <div className="space-y-4">
          {isOwner && (
            <div className="flex justify-end">
              <button onClick={() => setAddMemberModal(true)} className="btn-primary">
                <UserPlus className="w-4 h-4" /> Add Member
              </button>
            </div>
          )}
          <div className="card divide-y divide-slate-100">
            {project.members.map((m) => (
              <div key={m._id} className="flex items-center gap-3 px-5 py-3.5">
                <Avatar name={m.name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{m.name}</p>
                  <p className="text-xs text-slate-400">{m.email}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  m._id === project.owner._id ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {m._id === project.owner._id ? 'Owner' : m.role}
                </span>
                {isOwner && m._id !== project.owner._id && (
                  <button onClick={() => removeMember(m._id)} className="p-1.5 text-slate-300 hover:text-red-400 transition-colors">
                    <UserMinus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Modal */}
      <Modal isOpen={taskModal} onClose={() => setTaskModal(false)} title="Add Task">
        {error && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}
        <form onSubmit={createTask} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input className="input" placeholder="Task title" value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} placeholder="Optional description"
              value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Priority</label>
              <select className="input" value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="label">Due Date</label>
              <input className="input" type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Assignee</label>
            <select className="input" value={taskForm.assigneeId} onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}>
              <option value="">Unassigned</option>
              {project.members.map((m) => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setTaskModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Adding…' : 'Add Task'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit Project Modal */}
      <Modal isOpen={editProjectModal} onClose={() => setEditProjectModal(false)} title="Edit Project">
        <form onSubmit={updateProject} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={3} value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={projectForm.status} onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditProjectModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      {/* Add Member Modal */}
      <Modal isOpen={addMemberModal} onClose={() => setAddMemberModal(false)} title="Add Member">
        {nonMembers.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">All users are already members.</p>
        ) : (
          <div className="space-y-2">
            {nonMembers.map((u) => (
              <div key={u._id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-lg hover:bg-slate-50">
                <Avatar name={u.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{u.name}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </div>
                <button onClick={() => { addMember(u._id); setAddMemberModal(false); }} className="btn-primary py-1 px-3 text-xs">
                  Add
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
