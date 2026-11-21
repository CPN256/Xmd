import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowUpRight, Box, Check, ChevronDown,
  CircleHelp, CloudUpload, FileArchive, FileText, Gamepad2, Grid2X2, HardDrive,
  LayoutDashboard, LogOut, Music2, Package, Plus, Search, ShieldCheck, Smartphone,
  Sparkles, Trash2, X
} from 'lucide-react';

const API = '/api';
const CATEGORIES = ['Apps', 'Games', 'Documents', 'Tools', 'Music', 'Videos', 'Other'];
const TOKEN_KEY = 'catcpn_admin_token';

function bytesLabel(bytes = 0) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes; let index = 0;
  while (size >= 1024 && index < units.length - 1) { size /= 1024; index += 1; }
  return `${size.toFixed(index ? 1 : 0)} ${units[index]}`;
}

function dateLabel(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [username, setUsername] = useState('CAT CPN Admin');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [toast, setToast] = useState('');
  const [loginForm, setLoginForm] = useState({ username: 'catcpn', password: '' });
  const [loginBusy, setLoginBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'Apps', version: '1.0', featured: false, coverUrl: '' });
  const [file, setFile] = useState(null);

  function notify(message) {
    setToast(message);
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setToast(''), 3200);
  }

  async function api(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${API}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 && token) logout(false);
      throw new Error(data.message || 'Something went wrong.');
    }
    return data;
  }

  function logout(showMessage = true) {
    localStorage.removeItem(TOKEN_KEY);
    setToken(''); setItems([]); setTotal(0); setActiveTab('overview');
    if (showMessage) notify('You have signed out.');
  }

  async function login(event) {
    event.preventDefault();
    setLoginBusy(true);
    try {
      const response = await fetch(`${API}/admin/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Sign-in failed.');
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token); setUsername(data.username); setLoginForm((old) => ({ ...old, password: '' }));
      notify('Welcome to your download dashboard.');
    } catch (error) { notify(error.message); }
    finally { setLoginBusy(false); }
  }

  async function loadItems() {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '48' });
      const data = await api(`/downloads?${params}`);
      setItems(data.items || []); setTotal(data.total || 0);
    } catch (error) { notify(error.message); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!token) return;
    api('/admin/me').then((data) => setUsername(data.username)).catch(() => {});
    loadItems();
    // The token only changes at sign-in/sign-out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function publish(event) {
    event.preventDefault();
    if (!file) { notify('Select a file before publishing.'); return; }
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => payload.append(key, String(value)));
    payload.append('file', file);
    setUploadBusy(true);
    try {
      const data = await api('/downloads', { method: 'POST', body: payload });
      notify(data.message || 'Published successfully.');
      setForm({ title: '', description: '', category: 'Apps', version: '1.0', featured: false, coverUrl: '' });
      setFile(null);
      const input = document.getElementById('file-picker');
      if (input) input.value = '';
      setActiveTab('library');
      await loadItems();
    } catch (error) { notify(error.message); }
    finally { setUploadBusy(false); }
  }

  async function deleteItem(item) {
    if (!window.confirm(`Delete “${item.title}” and its stored file? This cannot be undone.`)) return;
    try {
      const data = await api(`/downloads/${item.id}`, { method: 'DELETE' });
      notify(data.message || 'Download deleted.');
      await loadItems();
    } catch (error) { notify(error.message); }
  }

  const filteredItems = useMemo(() => items.filter((item) => {
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    const term = query.trim().toLowerCase();
    const matchesQuery = !term || `${item.title} ${item.description} ${item.category}`.toLowerCase().includes(term);
    return matchesCategory && matchesQuery;
  }), [items, categoryFilter, query]);

  const stats = useMemo(() => ({
    downloads: items.reduce((sum, item) => sum + (item.downloads || 0), 0),
    featured: items.filter((item) => item.featured).length,
    storage: items.reduce((sum, item) => sum + (item.size || 0), 0)
  }), [items]);

  if (!token) return <LoginScreen form={loginForm} setForm={setLoginForm} onSubmit={login} busy={loginBusy} toast={toast} />;

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <a className="admin-brand" href="/"><span className="brand-icon">C<span>✦</span></span><span><b>CAT CPN</b><small>DOWNLOADS PANEL</small></span></a>
        <div className="side-label">WORKSPACE</div>
        <button className={`side-link ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}><LayoutDashboard size={17}/> Overview</button>
        <button className={`side-link ${activeTab === 'library' ? 'active' : ''}`} onClick={() => setActiveTab('library')}><Grid2X2 size={17}/> Manage library <span className="side-count">{total}</span></button>
        <button className={`side-link ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}><CloudUpload size={17}/> Upload a file</button>
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-icon"><ShieldCheck size={17}/></div><b>Keep your library safe</b><p>Only share files you own or have permission to distribute.</p><a href="/" target="_blank" rel="noreferrer">View public site <ArrowUpRight size={12}/></a></div>
          <div className="user-card"><span className="avatar">{username.slice(0, 1).toUpperCase()}</span><span className="user-copy"><b>{username}</b><small>Administrator</small></span><button className="logout-button" title="Sign out" onClick={() => logout()}><LogOut size={16}/></button></div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar"><div><div className="breadcrumb">CAT CPN <span>/</span> {activeTab === 'overview' ? 'Overview' : activeTab === 'library' ? 'Library' : 'Upload file'}</div><h1>{activeTab === 'overview' ? 'Dashboard overview' : activeTab === 'library' ? 'Manage your library' : 'Add a new download'}</h1></div><div className="top-actions"><a className="view-site" href="/" target="_blank" rel="noreferrer">View website <ArrowUpRight size={15}/></a><div className="online-badge"><span/> System online</div></div></header>

        {activeTab === 'overview' && <>
          <section className="welcome-banner"><div className="welcome-copy"><span className="banner-kicker"><Sparkles size={13}/> YOUR DIGITAL LIBRARY</span><h2>Make something<br/><em>worth downloading.</em></h2><p>Keep your files organised, publish new finds and manage your CAT CPN library from one place.</p><button className="primary-button" onClick={() => setActiveTab('upload')}><Plus size={16}/> Upload a file</button></div><div className="banner-graphic"><div className="banner-orbit orbit-one"/><div className="banner-orbit orbit-two"/><div className="banner-box"><ArrowDownToLine size={50}/><span>CPN</span></div><div className="banner-spark">✦</div></div></section>
          <section className="stats-grid">
            <Stat icon={<Package size={18}/>} label="Published files" value={total.toLocaleString()} note="Available in your library" tone="purple"/>
            <Stat icon={<ArrowDownToLine size={18}/>} label="Total downloads" value={stats.downloads.toLocaleString()} note="Across all published files" tone="mint"/>
            <Stat icon={<Sparkles size={18}/>} label="Featured items" value={stats.featured.toLocaleString()} note="Highlighted for visitors" tone="gold"/>
            <Stat icon={<HardDrive size={18}/>} label="Library storage" value={bytesLabel(stats.storage)} note="Total uploaded file size" tone="blue"/>
          </section>
          <section className="content-panel recent-panel"><div className="panel-heading"><div><h3>Recently published</h3><p>Your newest additions to the download hub.</p></div><button className="text-button" onClick={() => setActiveTab('library')}>View all <ArrowUpRight size={14}/></button></div><ItemTable items={items.slice(0, 5)} onDelete={deleteItem} loading={loading}/></section>
        </>}

        {activeTab === 'library' && <section className="content-panel library-panel"><div className="panel-heading"><div><h3>Your downloads <span className="sub-count">{total}</span></h3><p>Manage published files and see how they are performing.</p></div><button className="primary-button small" onClick={() => setActiveTab('upload')}><Plus size={15}/> Add download</button></div><div className="table-tools"><label className="admin-search"><Search size={16}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your library..."/></label><label className="select-wrap"><select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option>All</option>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select><ChevronDown size={14}/></label></div><ItemTable items={filteredItems} onDelete={deleteItem} loading={loading}/></section>}

        {activeTab === 'upload' && <section className="upload-layout"><div className="content-panel upload-panel"><div className="panel-heading"><div><h3>Publish a download</h3><p>Add the details visitors will see in the public library.</p></div><span className="secure-tag"><ShieldCheck size={13}/> Secure upload</span></div><form onSubmit={publish} className="upload-form">
          <div className="field"><label htmlFor="title">File title <span>*</span></label><input id="title" required minLength="2" maxLength="90" placeholder="e.g. CAT CPN Study Toolkit" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}/><small>Choose a clear name that visitors can recognise.</small></div>
          <div className="field-row"><div className="field"><label htmlFor="category">Category <span>*</span></label><select id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></div><div className="field"><label htmlFor="version">Version</label><input id="version" maxLength="30" placeholder="1.0" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })}/></div></div>
          <div className="field"><label htmlFor="description">Description</label><textarea id="description" rows="4" maxLength="700" placeholder="Tell visitors what this file does and what it includes..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/><small>Up to 700 characters.</small></div>
          <div className="field"><label>Download file <span>*</span></label><label className={`drop-zone ${file ? 'has-file' : ''}`} htmlFor="file-picker"><input id="file-picker" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} required accept=".apk,.pdf,.zip,.rar,.7z,.txt,.csv,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.gif,.mp3,.wav,.mp4,.mov"/><span className="drop-icon">{file ? <Check size={22}/> : <CloudUpload size={24}/>}</span><b>{file ? file.name : 'Choose a file or tap to browse'}</b><small>{file ? `${bytesLabel(file.size)} · Ready to publish` : 'APK, PDF, ZIP, documents, images, audio & video'}</small></label><small>Maximum upload size: configured by the site owner. Executable scripts are not accepted.</small></div>
          <div className="field"><label htmlFor="cover">Cover image URL <small>(optional)</small></label><input id="cover" type="url" placeholder="https://example.com/cover.jpg" value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}/></div>
          <label className="feature-check"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })}/><span className="check-ui"><Check size={12}/></span><span><b>Feature this download</b><small>Give it a featured badge in the public library.</small></span></label>
          <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setActiveTab('library')}>Cancel</button><button type="submit" className="primary-button" disabled={uploadBusy}>{uploadBusy ? <><span className="button-spinner"/> Publishing…</> : <><CloudUpload size={16}/> Publish download</>}</button></div>
        </form></div><aside className="upload-side"><div className="side-info-card"><div className="side-info-icon"><CircleHelp size={18}/></div><h3>Before you publish</h3><p>Make sure the file is safe, correctly labelled and something you have permission to share.</p><ul><li><Check size={13}/> Use an accurate title and version.</li><li><Check size={13}/> Add a helpful description.</li><li><Check size={13}/> Check your file before uploading.</li></ul></div><div className="side-info-card formats-card"><div className="side-info-icon"><FileArchive size={18}/></div><h3>Supported formats</h3><p>Common file types are accepted to keep the library useful and safer.</p><div className="format-tags">{['APK','PDF','ZIP','RAR','7Z','DOCX','PPTX','XLSX','JPG','PNG','MP3','MP4'].map((f) => <span key={f}>{f}</span>)}</div></div></aside></section>}
        <footer className="admin-footer"><span>CAT CPN DOWNLOADS <b>·</b> ADMIN CONSOLE</span><span>Made with <i>✦</i> by CAT PHOENIX</span></footer>
      </main>
      {toast && <div className="admin-toast"><Check size={15}/>{toast}<button onClick={() => setToast('')}><X size={14}/></button></div>}
    </div>
  );
}

function Stat({ icon, label, value, note, tone }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>;
}

function ItemTable({ items, onDelete, loading }) {
  if (loading) return <div className="table-empty"><span className="button-spinner dark"/>Loading files…</div>;
  if (!items.length) return <div className="table-empty"><span className="empty-table-icon"><FileText size={22}/></span><b>No files here yet</b><span>Upload your first download to populate the library.</span></div>;
  return <div className="table-scroll"><table><thead><tr><th>FILE</th><th>CATEGORY</th><th>SIZE</th><th>DOWNLOADS</th><th>ADDED</th><th></th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><div className="file-cell"><span className={`file-type ${item.category.toLowerCase()}`}>{item.category === 'Apps' ? <Smartphone size={17}/> : item.category === 'Games' ? <Gamepad2 size={17}/> : item.category === 'Music' ? <Music2 size={17}/> : <FileText size={17}/>}</span><span className="file-name"><b>{item.title}</b><small>{item.fileExtension || 'FILE'} · v{item.version || '1.0'} {item.featured && <em>FEATURED</em>}</small></span></div></td><td><span className="category-tag">{item.category}</span></td><td>{bytesLabel(item.size)}</td><td><span className="download-count"><ArrowDownToLine size={13}/>{(item.downloads || 0).toLocaleString()}</span></td><td>{dateLabel(item.createdAt)}</td><td><button className="delete-button" title={`Delete ${item.title}`} onClick={() => onDelete(item)}><Trash2 size={15}/></button></td></tr>)}</tbody></table></div>;
}

function LoginScreen({ form, setForm, onSubmit, busy, toast }) {
  return <div className="login-page"><div className="login-orb orb-left"/><div className="login-orb orb-right"/><div className="login-top"><a className="admin-brand" href="/"><span className="brand-icon">C<span>✦</span></span><span><b>CAT CPN</b><small>DOWNLOADS PANEL</small></span></a><a href="/" className="back-to-site"><ArrowLeft size={14}/> Back to website</a></div><div className="login-layout"><div className="login-promo"><div className="banner-kicker"><Sparkles size={13}/> THE CONTROL ROOM</div><h1>Your library.<br/><em>Your rules.</em></h1><p>Manage every download, publish new files and keep your digital hub organised with the CAT CPN admin console.</p><div className="login-feature"><span><ShieldCheck size={17}/></span><div><b>Private admin access</b><small>Only authorised administrators can publish files.</small></div></div><div className="login-feature"><span><Activity size={17}/></span><div><b>Simple library management</b><small>Track downloads and keep content up to date.</small></div></div></div><div className="login-card"><div className="login-card-icon"><Box size={22}/></div><div className="login-kicker">WELCOME BACK</div><h2>Sign in to your panel</h2><p>Enter your administrator details to continue.</p><form onSubmit={onSubmit}><label>Username<input autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required placeholder="Your admin username"/></label><label>Password<input type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required placeholder="Your password"/></label><button className="primary-button login-submit" disabled={busy}>{busy ? <><span className="button-spinner"/> Signing in…</> : <>Enter dashboard <ArrowUpRight size={16}/></>}</button></form><div className="login-security"><ShieldCheck size={14}/> Secure administrator sign-in</div></div></div><div className="login-footer">© {new Date().getFullYear()} CAT CPN DOWNLOADS <span>BUILT BY CAT PHOENIX</span></div>{toast && <div className="admin-toast"><X size={15}/>{toast}</div>}</div>;
}

export default App;
