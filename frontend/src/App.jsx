import React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import {
  Activity, AlertCircle, ArrowDown, ArrowUpRight, Bell, CalendarDays, Check,
  CheckCheck, CheckCircle2, ChevronDown, CircleHelp, Clock3, Command, LayoutDashboard,
  ListTodo, LogOut, Menu, MoreHorizontal, Plus, Search, Settings2, SlidersHorizontal,
  Sparkles, Star, Target, Trash2, X, Pencil, LoaderCircle
} from 'lucide-react';
import { api, setToken, socketUrl } from './api';

const initialForm = { title: '', description: '', priority: 'medium', status: 'todo', dueDate: '', important: false };
const fmtDate = value => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No due date';
const isOverdue = task => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [auth, setAuth] = useState({ name: '', email: '', password: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [activeNav, setActiveNav] = useState('Overview');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      const data = await api('/tasks');
      setTasks(data.tasks || []);
    } catch (error) { setNotice(error.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    api('/auth/me').then(data => { setUser(data.user); loadTasks(); })
      .catch(() => { setToken(null); setLoading(false); });
  }, [loadTasks]);

  useEffect(() => {
    if (!user) return;
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });
    socket.on('task:changed', event => {
      if (event.userId === user.id || event.userId === String(user.id)) loadTasks();
    });
    return () => socket.disconnect();
  }, [user, loadTasks]);

  const stats = useMemo(() => ({
    total: tasks.length,
    progress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(isOverdue).length
  }), [tasks]);

  const visibleTasks = useMemo(() => tasks.filter(task => {
    const q = query.toLowerCase();
    const matchesSearch = task.title.toLowerCase().includes(q) || (task.description || '').toLowerCase().includes(q);
    const matchesFilter = filter === 'all' || (filter === 'important' ? task.important : filter === 'today' ? task.dueDate && new Date(task.dueDate).toDateString() === new Date().toDateString() : task.status === filter);
    const matchesNav = activeNav !== 'Today' || (task.dueDate && new Date(task.dueDate).toDateString() === new Date().toDateString());
    const matchesImportant = activeNav !== 'Important' || task.important;
    return matchesSearch && matchesFilter && matchesNav && matchesImportant;
  }), [tasks, query, filter, activeNav]);

  async function submitAuth(event) {
    event.preventDefault(); setAuthLoading(true); setAuthError('');
    try {
      const data = await api(`/auth/${authMode === 'login' ? 'login' : 'register'}`, { method: 'POST', body: JSON.stringify(auth) });
      setToken(data.token); setUser(data.user); setLoading(true);
      const taskData = await api('/tasks'); setTasks(taskData.tasks || []); setLoading(false);
    } catch (error) { setAuthError(error.message); setLoading(false); }
    finally { setAuthLoading(false); }
  }

  function openCreate() { setEditing(null); setForm(initialForm); setModalOpen(true); }
  function openEdit(task) {
    setEditing(task);
    setForm({ title: task.title, description: task.description || '', priority: task.priority, status: task.status, dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '', important: task.important });
    setModalOpen(true);
  }
  async function saveTask(event) {
    event.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, dueDate: form.dueDate || null };
      const data = await api(editing ? `/tasks/${editing._id}` : '/tasks', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      setTasks(prev => editing ? prev.map(t => t._id === editing._id ? data.task : t) : [data.task, ...prev]);
      setModalOpen(false); setNotice(editing ? 'Task updated successfully.' : 'Task created successfully.');
    } catch (error) { setNotice(error.message); }
    finally { setSaving(false); }
  }
  async function toggleComplete(task) {
    const status = task.status === 'completed' ? 'todo' : 'completed';
    try {
      const { task: updated } = await api(`/tasks/${task._id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setTasks(prev => prev.map(t => t._id === updated._id ? updated : t));
    } catch (error) { setNotice(error.message); }
  }
  async function deleteTask(task) {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    try { await api(`/tasks/${task._id}`, { method: 'DELETE' }); setTasks(prev => prev.filter(t => t._id !== task._id)); setNotice('Task deleted.'); }
    catch (error) { setNotice(error.message); }
  }
  function logout() { setToken(null); setUser(null); setTasks([]); setNotice(''); }

  if (!user) return <AuthScreen auth={auth} setAuth={setAuth} mode={authMode} setMode={setAuthMode} onSubmit={submitAuth} loading={authLoading} error={authError} />;
  const greeting = user.name?.trim().split(' ')[0] || 'there';

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><CheckCheck size={20}/></div><span>taskmaster<span className="brand-dot">.</span></span></div>
      <div className="workspace"><div className="workspace-avatar">{greeting.slice(0, 1).toUpperCase()}</div><div className="workspace-copy"><strong>{user.name}</strong><span>Personal workspace</span></div><ChevronDown size={15}/></div>
      <div className="nav-label">WORKSPACE</div>
      <nav className="side-nav">
        {[['Overview', LayoutDashboard], ['My tasks', ListTodo], ['Today', CalendarDays], ['Important', Star]].map(([label, Icon]) =>
          <button key={label} className={`nav-item ${activeNav === label ? 'active' : ''}`} onClick={() => { setActiveNav(label); setMobileNav(false); }}>
            <Icon size={18}/><span>{label}</span>{label === 'My tasks' && <span className="nav-count">{tasks.length}</span>}
          </button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="upgrade-card"><div className="upgrade-icon"><Sparkles size={18}/></div><strong>Make room for focus</strong><p>Small steps add up to big progress.</p><div className="upgrade-progress"><span style={{ width: `${stats.total ? stats.completed / stats.total * 100 : 0}%` }}/></div><small>{stats.total ? Math.round(stats.completed / stats.total * 100) : 0}% of tasks completed</small></div>
        <button className="nav-item" onClick={() => setNotice('Settings are not included in this starter yet.')}><Settings2 size={18}/><span>Settings</span></button>
        <button className="nav-item" onClick={logout}><LogOut size={18}/><span>Log out</span></button>
        <div className="sidebar-footer"><span className="online-dot"/> All changes sync automatically</div>
      </div>
    </aside>

    {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)}/>}
    <main className="main-area">
      <header className="topbar">
        <button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMobileNav(!mobileNav)}><Menu size={20}/></button>
        <div className="breadcrumb">Workspace <span>/</span> <strong>{activeNav}</strong></div>
        <div className="topbar-actions">
          <label className="search-box"><Search size={17}/><input placeholder="Search tasks..." value={query} onChange={e => setQuery(e.target.value)}/><kbd>⌘ K</kbd></label>
          <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotice('You’re all caught up!')}><Bell size={18}/><i/></button>
          <div className="top-avatar" title={user.name}>{greeting.slice(0, 1).toUpperCase()}</div>
        </div>
      </header>

      <div className="page-content">
        <section className="welcome-row">
          <div><div className="eyebrow"><span className="eyebrow-dot"/> YOUR PRODUCTIVITY SPACE</div><h1>Good morning, {greeting} <span className="wave">✦</span></h1><p>Here’s what’s happening with your tasks today.</p></div>
          <button className="primary-button" onClick={openCreate}><Plus size={18}/> New task</button>
        </section>

        {notice && <div className="toast" role="status"><CheckCircle2 size={17}/><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15}/></button></div>}

        <section className="stats-grid">
          <StatCard label="Total tasks" value={stats.total} note="Across your workspace" icon={ListTodo} tone="blue"/>
          <StatCard label="In progress" value={stats.progress} note="Keep the momentum" icon={Activity} tone="amber"/>
          <StatCard label="Completed" value={stats.completed} note="Look at you go!" icon={CheckCircle2} tone="green"/>
          <StatCard label="Overdue" value={stats.overdue} note="Needs your attention" icon={AlertCircle} tone="rose"/>
        </section>

        <section className="content-grid">
          <div className="panel task-panel">
            <div className="panel-header"><div><h2>{activeNav === 'Overview' ? 'Your tasks' : activeNav}</h2><p>A little progress every day adds up.</p></div><button className="subtle-button" onClick={openCreate}><Plus size={16}/> Add task</button></div>
            <div className="task-toolbar"><div className="filter-tabs">{[['all','All tasks'],['todo','To do'],['in-progress','In progress'],['completed','Completed']].map(([value,label])=><button key={value} onClick={() => setFilter(value)} className={filter === value ? 'selected' : ''}>{label}</button>)}</div><button className="filter-icon" title="Show important tasks" onClick={() => setFilter(filter === 'important' ? 'all' : 'important')}><SlidersHorizontal size={17}/></button></div>
            {loading ? <div className="loading-state"><LoaderCircle className="spin" size={24}/> Loading your tasks…</div> : visibleTasks.length ? <div className="task-list">{visibleTasks.map(task => <TaskRow key={task._id} task={task} onToggle={toggleComplete} onEdit={openEdit} onDelete={deleteTask}/>)}</div> : <div className="empty-state"><div className="empty-icon"><Target size={25}/></div><h3>{query ? 'No matching tasks' : 'A fresh start'}</h3><p>{query ? 'Try another search term.' : 'Create your first task and turn your plans into progress.'}</p>{!query && <button className="primary-button small" onClick={openCreate}><Plus size={16}/> Create a task</button>}</div>}
            <div className="panel-footer"><span>Showing <strong>{visibleTasks.length}</strong> of <strong>{tasks.length}</strong> tasks</span><span className="live-label"><span className="online-dot"/> Live sync enabled</span></div>
          </div>

          <div className="right-column">
            <div className="panel focus-panel"><div className="panel-header compact"><div><h2>Weekly focus</h2><p>Your consistency at a glance</p></div><span className="mini-icon"><Activity size={17}/></span></div>
              <div className="focus-score"><div><strong>{stats.total ? Math.round(stats.completed / stats.total * 100) : 0}<small>%</small></strong><span>completion rate</span></div><div className="focus-ring" style={{'--progress': `${stats.total ? stats.completed / stats.total * 100 : 0}%`}}><Check size={23}/></div></div>
              <div className="focus-bar"><span style={{ width: `${stats.total ? stats.completed / stats.total * 100 : 0}%` }}/></div>
              <div className="focus-legend"><span><i className="legend-done"/>Completed <b>{stats.completed}</b></span><span><i className="legend-left"/>Remaining <b>{stats.total - stats.completed}</b></span></div>
            </div>
            <div className="panel deadlines-panel"><div className="panel-header compact"><div><h2>Upcoming deadlines</h2><p>Keep an eye on what’s next</p></div><CalendarDays size={18} className="muted-icon"/></div>
              {tasks.filter(t => t.dueDate && t.status !== 'completed').sort((a,b) => new Date(a.dueDate)-new Date(b.dueDate)).slice(0,4).map(task => <div className="deadline-row" key={task._id}><span className={`deadline-dot ${isOverdue(task) ? 'late' : task.priority}`}/><div className="deadline-copy"><strong>{task.title}</strong><span>{isOverdue(task) ? 'Overdue' : fmtDate(task.dueDate)}</span></div><button className="tiny-edit" onClick={() => openEdit(task)} aria-label={`Edit ${task.title}`}><ArrowUpRight size={15}/></button></div>)}
              {!tasks.some(t => t.dueDate && t.status !== 'completed') && <div className="no-deadlines"><CalendarDays size={21}/><span>No upcoming deadlines. Enjoy the breathing room.</span></div>}
            </div>
            <div className="quote-card"><div className="quote-spark"><Sparkles size={18}/></div><p>“The secret of getting ahead is getting started.”</p><span>— Mark Twain</span></div>
          </div>
        </section>
        <footer className="app-footer"><span>© 2025 TaskMaster</span><span><CircleHelp size={14}/> Built for better focus</span><span><Command size={13}/> Make today count</span></footer>
      </div>
    </main>

    {modalOpen && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModalOpen(false); }}><section className="task-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-heading"><div><div className="modal-kicker">{editing ? 'MAKE AN UPDATE' : 'A NEW BEGINNING'}</div><h2 id="modal-title">{editing ? 'Edit task' : 'Create a task'}</h2><p>Give your next step a little clarity.</p></div><button className="icon-button" onClick={() => setModalOpen(false)} aria-label="Close"><X size={19}/></button></div>
      <form onSubmit={saveTask} className="task-form"><label>Task title <span>*</span><input autoFocus maxLength={160} required placeholder="e.g. Prepare project proposal" value={form.title} onChange={e => setForm({...form,title:e.target.value})}/></label>
        <label>Description <small>Optional</small><textarea rows="3" maxLength={3000} placeholder="Add a few details to make this actionable…" value={form.description} onChange={e => setForm({...form,description:e.target.value})}/></label>
        <div className="form-row"><label>Priority<select value={form.priority} onChange={e => setForm({...form,priority:e.target.value})}><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option></select></label><label>Due date<input type="date" value={form.dueDate} onChange={e => setForm({...form,dueDate:e.target.value})}/></label></div>
        <label>Status<select value={form.status} onChange={e => setForm({...form,status:e.target.value})}><option value="todo">To do</option><option value="in-progress">In progress</option><option value="completed">Completed</option></select></label>
        <label className="important-toggle"><input type="checkbox" checked={form.important} onChange={e => setForm({...form,important:e.target.checked})}/><span className="custom-check"><Check size={13}/></span><span><strong>Mark as important</strong><small>Keep this task on your radar</small></span><Star size={17} className="important-star"/></label>
        <div className="modal-actions"><button type="button" className="cancel-button" onClick={() => setModalOpen(false)}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? <LoaderCircle size={17} className="spin"/> : <Plus size={17}/>} {saving ? 'Saving…' : editing ? 'Save changes' : 'Create task'}</button></div>
      </form></section></div>}
  </div>;
}

function StatCard({label,value,note,icon:Icon,tone}) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19}/></div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{note}</small></div><div className={`stat-decoration ${tone}`}><ArrowUpRight size={17}/></div></article>;
}

function TaskRow({task,onToggle,onEdit,onDelete}) {
  return <article className={`task-row ${task.status === 'completed' ? 'task-done' : ''}`}>
    <button className={`task-check ${task.status === 'completed' ? 'checked' : ''}`} onClick={() => onToggle(task)} aria-label={task.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}>{task.status === 'completed' && <Check size={14}/>}</button>
    <div className="task-main"><div className="task-title-line"><h3>{task.title}</h3>{task.important && <Star size={14} className="task-star" fill="currentColor"/>}</div>{task.description && <p>{task.description}</p>}<div className="task-meta"><span className={`priority-pill ${task.priority}`}>{task.priority}</span><span className={`status-pill ${task.status}`}>{task.status === 'todo' ? 'To do' : task.status === 'in-progress' ? 'In progress' : 'Completed'}</span><span className={`due-date ${isOverdue(task) ? 'overdue' : ''}`}><Clock3 size={12}/>{isOverdue(task) ? 'Overdue · ' : ''}{fmtDate(task.dueDate)}</span></div></div>
    <div className="task-actions"><button title="Edit task" onClick={() => onEdit(task)}><Pencil size={15}/></button><button title="Delete task" onClick={() => onDelete(task)}><Trash2 size={15}/></button><button title="More options" onClick={() => onEdit(task)}><MoreHorizontal size={17}/></button></div>
  </article>;
}

function AuthScreen({auth,setAuth,mode,setMode,onSubmit,loading,error}) {
  return <div className="auth-page"><div className="auth-decoration decor-one"/><div className="auth-decoration decor-two"/><div className="auth-card"><div className="auth-brand"><div className="brand-mark"><CheckCheck size={20}/></div><span>taskmaster<span className="brand-dot">.</span></span></div><div className="auth-illustration"><div className="illustration-orbit orbit-a"/><div className="illustration-orbit orbit-b"/><div className="illustration-note note-a"><CheckCircle2 size={16}/><span>One thing at a time</span></div><div className="illustration-note note-b"><Sparkles size={16}/><span>Progress feels good</span></div><div className="illustration-center"><ListTodo size={45}/><CheckCircle2 size={24} className="illustration-check"/></div></div><div className="auth-copy"><div className="eyebrow"><span className="eyebrow-dot"/> YOUR SPACE TO GET THINGS DONE</div><h1>{mode === 'login' ? 'Welcome back.' : 'Start with a clear mind.'}</h1><p>{mode === 'login' ? 'Your goals are waiting. Pick up where you left off.' : 'Create your account and make space for what matters.'}</p></div><form onSubmit={onSubmit} className="auth-form">{mode === 'register' && <label>Full name<input required minLength={2} placeholder="Your name" value={auth.name} onChange={e=>setAuth({...auth,name:e.target.value})}/></label>}<label>Email address<input required type="email" placeholder="you@example.com" value={auth.email} onChange={e=>setAuth({...auth,email:e.target.value})}/></label><label>Password<input required minLength={mode === 'register' ? 8 : 1} type="password" placeholder={mode === 'register' ? 'At least 8 characters' : 'Enter your password'} value={auth.password} onChange={e=>setAuth({...auth,password:e.target.value})}/></label>{error && <div className="auth-error"><AlertCircle size={16}/>{error}</div>}<button className="primary-button auth-submit" disabled={loading}>{loading && <LoaderCircle size={17} className="spin"/>}{mode === 'login' ? 'Sign in to your workspace' : 'Create your account'}<ArrowUpRight size={17}/></button></form><div className="auth-switch">{mode === 'login' ? 'New to TaskMaster?' : 'Already have an account?'} <button onClick={()=>setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></div><div className="auth-privacy"><span><CheckCircle2 size={14}/> Private workspace</span><span><CheckCircle2 size={14}/> Secure sign-in</span></div></div><div className="auth-side-copy">MAKE PROGRESS, NOT PRESSURE <span>✳</span></div></div>;
}

export default App;
