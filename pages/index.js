import { useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'

const STATUS_LIST = ['New','In Progress','Approval Required','Submitted / Pending','Won','Lost']
const ESTIMATORS = ['Sarah K.','Tom B.','Dan R.']

function fmt(v) { return '$' + Number(v).toLocaleString() }
function today() { return new Date().toISOString().slice(0,10) }
function nextLetter(c) { return String.fromCharCode(c.charCodeAt(0)+1) }

function Badge({ status }) {
  const map = {
    'New': 'badge-new', 'In Progress': 'badge-ip', 'Approval Required': 'badge-appr',
    'Submitted / Pending': 'badge-sub', 'Won': 'badge-won', 'Lost': 'badge-lost',
    'Approved': 'badge-approved', 'Pending': 'badge-pending',
  }
  return <span className={`badge ${map[status]||'badge-new'}`}>{status}</span>
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{title}</div>
        {children}
      </div>
    </div>
  )
}

function Notification({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t) }, [onDone])
  return <div className={`notif ${type==='ok'?'notif-ok':''}`}>{msg}</div>
}

export default function App() {
  const [data, setData] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [modal, setModal] = useState(null)
  const [detail, setDetail] = useState(null)
  const [notif, setNotif] = useState(null)
  const [syncState, setSyncState] = useState('saved')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const saveTimer = useRef(null)

  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(setData)
  }, [])

  const save = useCallback((newData) => {
    setSyncState('saving')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch('/api/save', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(newData) })
        setSyncState('saved')
      } catch { setSyncState('error') }
    }, 600)
  }, [])

  const update = useCallback((newData) => {
    setData(newData)
    save(newData)
  }, [save])

  const notify = (msg, type='') => setNotif({ msg, type })
  const closeModal = () => setModal(null)
  const closeDetail = () => setDetail(null)

  const navigate = (p) => { setPage(p); setDetail(null); setSearch(''); setStatusFilter('') }

  if (!data) return (
    <div className="loading">
      <div className="spinner" />
      Loading your data...
    </div>
  )

  const filteredTenders = data.tenders.filter(t => {
    const q = search.toLowerCase()
    const matchQ = !q || t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || t.client.toLowerCase().includes(q)
    const matchS = !statusFilter || t.status === statusFilter
    return matchQ && matchS
  })

  function createTender(form) {
    const id = 'PRO' + (data.counter + 1)
    const newTender = { id, name:form.name, client:form.client, status:'New', value:Number(form.value)||0, margin:Number(form.margin)||0, estimator:form.estimator, revision:'A', dueDate:form.dueDate, created:today(), approvalStatus:'N/A', lossReason:'' }
    const nd = { ...data, counter: data.counter+1, tenders: [newTender, ...data.tenders] }
    update(nd)
    closeModal()
    notify(`${id} created — folders auto-generated`, 'ok')
    navigate('pipeline')
  }

  function addClient(form) {
    const nd = { ...data, clients: [...data.clients, { name:form.name, contact:form.contact, email:form.email }] }
    update(nd)
    closeModal()
    notify(`${form.name} added`, 'ok')
  }

  function startEstimating(id) {
    const nd = { ...data, tenders: data.tenders.map(t => t.id===id ? {...t, status:'In Progress'} : t) }
    update(nd)
    notify(`${id} — estimating stage started`, 'ok')
    closeDetail()
  }

  function triggerApproval(id) {
    const t = data.tenders.find(x=>x.id===id)
    const alreadyInLog = data.approvals.find(a=>a.proId===id)
    const nd = {
      ...data,
      tenders: data.tenders.map(t => t.id===id ? {...t, status:'Approval Required', approvalStatus:'Pending'} : t),
      approvals: alreadyInLog ? data.approvals : [...data.approvals, { proId:id, name:t.name, value:t.value, approver:'Jim', status:'Pending', date:'', comments:'' }]
    }
    update(nd)
    notify(`Approval request sent to Jim for ${id} (${fmt(t.value)})`, 'ok')
    closeDetail()
  }

  function approveNow(id) {
    const nd = {
      ...data,
      tenders: data.tenders.map(t => t.id===id ? {...t, approvalStatus:'Approved', status: t.status==='Approval Required'?'In Progress':t.status} : t),
      approvals: data.approvals.map(a => a.proId===id ? {...a, status:'Approved', date:today(), comments:'Approved via system'} : a)
    }
    update(nd)
    notify(`${id} approved — submission unblocked`, 'ok')
    closeDetail()
  }

  function generateSub(id) {
    const t = data.tenders.find(x=>x.id===id)
    if (!t) return
    if (Number(t.value)>=500000 && t.approvalStatus!=='Approved') { notify('Blocked — Jim\'s approval required'); return }
    const newRev = nextLetter(t.revision)
    const newRevEntry = { proId:id, rev:newRev, file:`Tender_REV-${newRev}.docx`, date:today(), estimator:t.estimator, value:t.value, note:'Generated from _EXPORT sheet' }
    const nd = {
      ...data,
      tenders: data.tenders.map(x => x.id===id ? {...x, revision:newRev, status:'Submitted / Pending'} : x),
      revisions: [newRevEntry, ...data.revisions]
    }
    update(nd)
    notify(`REV-${newRev} generated — Estimate_REV-${newRev}.xlsx + Tender_REV-${newRev}.docx + PDF saved`, 'ok')
    closeDetail()
  }

  function markWon(id) {
    const nd = { ...data, tenders: data.tenders.map(t => t.id===id ? {...t, status:'Won'} : t) }
    update(nd)
    notify(`${id} marked Won — project folders unlocked`, 'ok')
    closeDetail()
  }

  function markLost(id, reason) {
    const nd = { ...data, tenders: data.tenders.map(t => t.id===id ? {...t, status:'Lost', lossReason:reason} : t) }
    update(nd)
    closeModal()
    notify(`${id} marked Lost — folders locked`)
    closeDetail()
  }

  const activeTenders = data.tenders.filter(t => !['Won','Lost'].includes(t.status))
  const pipelineValue = activeTenders.reduce((a,t)=>a+Number(t.value),0)
  const needApproval = activeTenders.filter(t=>t.status==='Approval Required').length

  return (
    <>
      <Head><title>Tenders & Projects Hub</title></Head>
      <div className="app">

        {/* Sidebar */}
        <nav className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-title">Tenders & Projects</div>
            <div className="sync-row">
              <span className={`sync-dot ${syncState==='saving'?'saving':syncState==='error'?'error':''}`} />
              <span className="sync-label">{syncState==='saving'?'Saving...':syncState==='error'?'Save error':'All saved'}</span>
            </div>
          </div>
          <div className="nav-section">
            <div className="nav-label">Overview</div>
            {[['dashboard','⊞','Dashboard'],['pipeline','≡','Tender Register']].map(([id,icon,label])=>(
              <div key={id} className={`nav-item ${page===id?'active':''}`} onClick={()=>navigate(id)}>{icon} {label}</div>
            ))}
          </div>
          <div className="nav-section">
            <div className="nav-label">Lists</div>
            {[['clients','○','Clients'],['revisions','↺','Revision Log'],['approvals','✓','Approvals Log']].map(([id,icon,label])=>(
              <div key={id} className={`nav-item ${page===id?'active':''}`} onClick={()=>navigate(id)}>{icon} {label}</div>
            ))}
          </div>
          <div className="nav-section">
            <div className="nav-label">Workflows</div>
            <div className={`nav-item ${page==='flows'?'active':''}`} onClick={()=>navigate('flows')}>→ Power Automate</div>
          </div>
        </nav>

        {/* Main */}
        <div className="main">
          <header className="topbar">
            <h1 className="topbar-title">{{ dashboard:'Dashboard', pipeline:'Tender Register', clients:'Clients', revisions:'Revision Log', approvals:'Approvals Log', flows:'Power Automate Flows' }[page]}</h1>
            <div className="topbar-actions">
              {['dashboard','pipeline'].includes(page) && <button className="btn-primary" onClick={()=>setModal('newTender')}>+ New Tender</button>}
              {page==='clients' && <button className="btn-primary" onClick={()=>setModal('newClient')}>+ Add Client</button>}
            </div>
          </header>

          <main className="content">

            {/* DASHBOARD */}
            {page==='dashboard' && <>
              <div className="grid-4">
                <div className="mc"><div className="mc-label">Active tenders</div><div className="mc-val">{activeTenders.length}</div></div>
                <div className="mc"><div className="mc-label">Pipeline value</div><div className="mc-val" style={{fontSize:15}}>{fmt(pipelineValue)}</div></div>
                <div className="mc"><div className="mc-label">Won (all time)</div><div className="mc-val" style={{color:'#0F6E56'}}>{data.tenders.filter(t=>t.status==='Won').length}</div></div>
                <div className="mc"><div className="mc-label">Pending approval</div><div className="mc-val" style={{color:needApproval?'#A32D2D':'inherit'}}>{needApproval}</div></div>
              </div>
              {needApproval > 0 && (
                <div className="alert-banner">
                  <span>{needApproval} tender{needApproval>1?'s':''} require Jim's approval before submission</span>
                  <button onClick={()=>navigate('approvals')}>Review</button>
                </div>
              )}
              <div className="grid-2">
                <div className="card">
                  <div className="section-title">Recent tenders</div>
                  <table><thead><tr><th>Project</th><th>Status</th><th>Value</th></tr></thead>
                  <tbody>{data.tenders.slice(0,5).map(t=>(
                    <tr key={t.id} className="clickable" onClick={()=>setDetail(t.id)}>
                      <td><div className="pro-tag">{t.id}</div><div className="sub-text">{t.name}</div></td>
                      <td><Badge status={t.status}/></td>
                      <td className="fw">{fmt(t.value)}</td>
                    </tr>
                  ))}</tbody></table>
                </div>
                <div className="card">
                  <div className="section-title">Status breakdown</div>
                  {STATUS_LIST.map(s=>(
                    <div key={s} className="status-row">
                      <Badge status={s}/>
                      <span className="fw">{data.tenders.filter(t=>t.status===s).length}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>}

            {/* PIPELINE */}
            {page==='pipeline' && <>
              <div className="search-bar">
                <input className="search-input" placeholder="Search tenders..." value={search} onChange={e=>setSearch(e.target.value)}/>
                <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{width:170}}>
                  <option value="">All statuses</option>
                  {STATUS_LIST.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="card table-card">
                <table>
                  <thead><tr><th>PRO#</th><th>Project</th><th>Client</th><th>Estimator</th><th>Due</th><th>Rev</th><th>Value</th><th>Margin</th><th>Approval</th><th>Status</th><th></th></tr></thead>
                  <tbody>{filteredTenders.map(t=>(
                    <tr key={t.id} className="clickable" onClick={()=>setDetail(t.id)}>
                      <td><span className="pro-tag">{t.id}</span></td>
                      <td className="fw truncate">{t.name}</td>
                      <td className="muted">{t.client}</td>
                      <td className="muted">{t.estimator}</td>
                      <td className="muted nowrap">{t.dueDate}</td>
                      <td><span className="mono">{t.revision}</span></td>
                      <td className="fw nowrap">{fmt(t.value)}</td>
                      <td className="muted">{t.margin}%</td>
                      <td>{t.approvalStatus==='Approved'?<Badge status="Approved"/>:t.approvalStatus==='Pending'?<Badge status="Pending"/>:<span className="dash">—</span>}</td>
                      <td><Badge status={t.status}/></td>
                      <td className="nowrap" onClick={e=>e.stopPropagation()}>
                        {t.status==='In Progress' && Number(t.value)>=500000 && t.approvalStatus!=='Approved' && <button className="btn-sm" onClick={()=>triggerApproval(t.id)}>Send for approval</button>}
                        {t.status==='In Progress' && (Number(t.value)<500000||t.approvalStatus==='Approved') && <button className="btn-sm" onClick={()=>generateSub(t.id)}>Generate</button>}
                        {t.status==='Submitted / Pending' && <button className="btn-sm btn-ok" onClick={()=>markWon(t.id)}>Mark Won</button>}
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>}

            {/* CLIENTS */}
            {page==='clients' && (
              <div className="card table-card">
                <table>
                  <thead><tr><th>Client</th><th>Contact</th><th>Email</th><th>Tenders</th></tr></thead>
                  <tbody>{data.clients.map((c,i)=>(
                    <tr key={i}>
                      <td className="fw">{c.name}</td>
                      <td className="muted">{c.contact}</td>
                      <td className="mono muted">{c.email}</td>
                      <td className="fw">{data.tenders.filter(t=>t.client===c.name).length}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}

            {/* REVISIONS */}
            {page==='revisions' && (
              <div className="card table-card">
                <table>
                  <thead><tr><th>PRO#</th><th>Rev</th><th>File</th><th>Date</th><th>Estimator</th><th>Value</th><th>Note</th></tr></thead>
                  <tbody>{[...data.revisions].reverse().map((r,i)=>(
                    <tr key={i}>
                      <td><span className="pro-tag">{r.proId}</span></td>
                      <td><span className="mono fw">REV-{r.rev}</span></td>
                      <td className="mono muted small">{r.file}</td>
                      <td className="muted nowrap">{r.date}</td>
                      <td className="muted">{r.estimator}</td>
                      <td className="fw nowrap">{fmt(r.value)}</td>
                      <td className="muted small">{r.note}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}

            {/* APPROVALS */}
            {page==='approvals' && <>
              <p className="page-desc">Tenders ≥ $500,000 require Jim's approval before submission is permitted.</p>
              <div className="card table-card">
                <table>
                  <thead><tr><th>PRO#</th><th>Project</th><th>Value</th><th>Approver</th><th>Status</th><th>Date</th><th>Comments</th><th></th></tr></thead>
                  <tbody>{data.approvals.map((a,i)=>(
                    <tr key={i}>
                      <td><span className="pro-tag">{a.proId}</span></td>
                      <td className="fw">{a.name}</td>
                      <td className="fw nowrap">{fmt(a.value)}</td>
                      <td>{a.approver}</td>
                      <td><Badge status={a.status}/></td>
                      <td className="muted">{a.date||'—'}</td>
                      <td className="muted small">{a.comments||'—'}</td>
                      <td>{a.status==='Pending'&&<button className="btn-sm btn-primary-sm" onClick={()=>approveNow(a.proId)}>Approve</button>}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>}

            {/* FLOWS */}
            {page==='flows' && [
              {name:'Create Tender',trigger:'New list item',steps:['Generate PRO#### from counter','Create folder structure','Copy Excel & Word templates','Set status → New']},
              {name:'Start Estimating',trigger:'Status → In Progress',steps:['Unlock 01_Tender folders','Notify estimator','Record start timestamp']},
              {name:'Approval Gate',trigger:'Value ≥ $500,000',steps:['Set status → Approval Required','Email Jim','Block submission','Log to Approvals List']},
              {name:'Generate Submission',trigger:'Manual trigger',steps:['Read _EXPORT named cells','Map to Word content controls','Snapshot Estimate_REV-X.xlsx','Save Tender_REV-X.docx + PDF','Log revision + increment letter']},
              {name:'Mark Won',trigger:'Status → Won',steps:['Unlock project folders','Promote budget to project sheet','Notify project manager','Archive tender stage']},
              {name:'Mark Lost',trigger:'Status → Lost',steps:['Lock all folders','Record loss reason','Send notification','Archive']},
            ].map(f=>(
              <div key={f.name} className="card flow-card">
                <div className="flow-header">
                  <div><span className="fw">{f.name}</span><span className="flow-trigger">Trigger: {f.trigger}</span></div>
                  <Badge status="Won" />
                </div>
                <div className="flow-steps">
                  {f.steps.map((s,i)=><span key={i} className="flow-step-wrap">
                    {i>0&&<span className="flow-arrow">→</span>}
                    <span className="flow-step">{s}</span>
                  </span>)}
                </div>
              </div>
            ))}

          </main>
        </div>

        {/* Detail Panel */}
        {detail && (() => {
          const t = data.tenders.find(x=>x.id===detail)
          if (!t) return null
          const steps = ['New','In Progress','Approval Required','Submitted / Pending','Won']
          const ci = steps.indexOf(t.status)
          const revs = data.revisions.filter(r=>r.proId===t.id)
          return (
            <aside className="detail-panel">
              <div className="detail-header">
                <div>
                  <div className="pro-tag" style={{fontSize:13}}>{t.id}</div>
                  <div style={{fontSize:15,fontWeight:500,marginTop:3}}>{t.name}</div>
                  <div className="muted small" style={{marginTop:2}}>{t.client} · {t.estimator}</div>
                </div>
                <button className="close-btn" onClick={closeDetail}>×</button>
              </div>
              <div className="grid-2-sm">
                <div className="mc"><div className="mc-label">Value</div><div style={{fontSize:15,fontWeight:500}}>{fmt(t.value)}</div></div>
                <div className="mc"><div className="mc-label">Margin</div><div style={{fontSize:15,fontWeight:500}}>{t.margin}%</div></div>
              </div>
              {t.status==='Approval Required' && (
                <div className="alert-banner sm">
                  <span>Requires Jim's approval</span>
                  {t.approvalStatus==='Pending'
                    ? <button className="btn-primary-sm" onClick={()=>approveNow(t.id)}>Approve</button>
                    : <Badge status="Approved"/>}
                </div>
              )}
              <div className="detail-section">
                <div className="section-title">Progress</div>
                <div className="progress-steps">
                  {steps.map((s,i)=><span key={s} className="ps-wrap">
                    {i>0&&<span className="ps-line"/>}
                    <span className={`ps-dot ${i<ci?'done':i===ci?'active':'todo'}`}>{i<ci?'✓':i+1}</span>
                    <span className="ps-label">{s.replace(' / Pending','').replace(' Required','').replace('Submitted','Subm.')}</span>
                  </span>)}
                </div>
              </div>
              <div className="detail-section">
                <div className="section-title">Folder structure</div>
                <div className="folder-tree card">
                  <div>📁 {t.id} – {t.name}</div>
                  <div style={{paddingLeft:14}}>📁 01_Tender</div>
                  {['01_Documents','02_Takeoffs','03_RFQs','04_Quotes','05_Estimate','06_Submission'].map(f=>(
                    <div key={f} style={{paddingLeft:28,color:'var(--text-secondary)'}}>{f}</div>
                  ))}
                  {['02_Project','03_Commercial','04_Site','05_Compliance'].map(f=>(
                    <div key={f} style={{paddingLeft:14,color:'var(--text-tertiary)'}}>🔒 {f} {f==='02_Project'&&t.status==='Won'?'(unlocked)':'(locked)'}</div>
                  ))}
                </div>
              </div>
              <div className="detail-section">
                <div className="section-title">Revisions ({revs.length})</div>
                {revs.length===0 ? <div className="muted small">No revisions yet</div> : revs.map((r,i)=>(
                  <div key={i} className="rev-row">
                    <div><span className="mono fw small">REV-{r.rev}</span><span className="muted small" style={{marginLeft:8}}>{r.date}</span><div className="muted small">{r.note}</div></div>
                    <span className="fw small nowrap">{fmt(r.value)}</span>
                  </div>
                ))}
              </div>
              <div className="detail-actions">
                {t.status==='New' && <button className="btn-primary" onClick={()=>startEstimating(t.id)}>Start Estimating</button>}
                {t.status==='In Progress' && (Number(t.value)<500000||t.approvalStatus==='Approved') && <button className="btn-primary" onClick={()=>generateSub(t.id)}>Generate Submission (REV-{nextLetter(t.revision)})</button>}
                {t.status==='In Progress' && Number(t.value)>=500000 && t.approvalStatus!=='Approved' && <button onClick={()=>triggerApproval(t.id)}>Send for Jim's approval</button>}
                {t.status==='Submitted / Pending' && <>
                  <button className="btn-ok" onClick={()=>markWon(t.id)}>Mark as Won</button>
                  <button className="btn-danger" onClick={()=>setModal({type:'lost',id:t.id})}>Mark as Lost</button>
                </>}
              </div>
            </aside>
          )
        })()}

        {/* Modals */}
        {modal==='newTender' && <NewTenderModal clients={data.clients} onClose={closeModal} onCreate={createTender}/>}
        {modal==='newClient' && <NewClientModal onClose={closeModal} onCreate={addClient}/>}
        {modal?.type==='lost' && <LostModal id={modal.id} onClose={closeModal} onConfirm={markLost}/>}

        {/* Notification */}
        {notif && <Notification key={notif.msg+notif.type} msg={notif.msg} type={notif.type} onDone={()=>setNotif(null)}/>}
      </div>
    </>
  )
}

function NewTenderModal({ clients, onClose, onCreate }) {
  const [f, setF] = useState({ name:'', client:'', dueDate:'', estimator:'Sarah K.', value:'', margin:'' })
  const set = k => e => setF(p=>({...p,[k]:e.target.value}))
  const submit = () => {
    if (!f.name || !f.client || !f.dueDate) return alert('Fill in required fields')
    onCreate(f)
  }
  return (
    <Modal title="Create new tender" onClose={onClose}>
      <div className="fg"><label className="fl">Project name *</label><input value={f.name} onChange={set('name')} placeholder="e.g. Northside Warehouse Fitout"/></div>
      <div className="form-row">
        <div className="fg"><label className="fl">Client *</label>
          <select value={f.client} onChange={set('client')}>
            <option value="">Select client...</option>
            {clients.map(c=><option key={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div className="fg"><label className="fl">Due date *</label><input type="date" value={f.dueDate} onChange={set('dueDate')}/></div>
      </div>
      <div className="form-row">
        <div className="fg"><label className="fl">Estimator</label>
          <select value={f.estimator} onChange={set('estimator')}>
            {ESTIMATORS.map(e=><option key={e}>{e}</option>)}
          </select>
        </div>
        <div className="fg"><label className="fl">Initial value ($)</label><input type="number" value={f.value} onChange={set('value')} placeholder="0"/></div>
      </div>
      <div className="form-row">
        <div className="fg"><label className="fl">Margin (%)</label><input type="number" value={f.margin} onChange={set('margin')} placeholder="0"/></div>
        <div/>
      </div>
      <div className="modal-actions">
        <button onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit}>Create + generate folders</button>
      </div>
    </Modal>
  )
}

function NewClientModal({ onClose, onCreate }) {
  const [f, setF] = useState({ name:'', contact:'', email:'' })
  const set = k => e => setF(p=>({...p,[k]:e.target.value}))
  return (
    <Modal title="Add new client" onClose={onClose}>
      <div className="fg"><label className="fl">Client name *</label><input value={f.name} onChange={set('name')}/></div>
      <div className="fg"><label className="fl">Contact person</label><input value={f.contact} onChange={set('contact')}/></div>
      <div className="fg"><label className="fl">Email</label><input type="email" value={f.email} onChange={set('email')}/></div>
      <div className="modal-actions">
        <button onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={()=>{ if(!f.name) return; onCreate(f) }}>Add client</button>
      </div>
    </Modal>
  )
}

function LostModal({ id, onClose, onConfirm }) {
  const [reason, setReason] = useState('')
  return (
    <Modal title={`Mark as Lost — ${id}`} onClose={onClose}>
      <div className="fg"><label className="fl">Loss reason</label><textarea rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Budget cut, competitor pricing..."/></div>
      <div className="modal-actions">
        <button onClick={onClose}>Cancel</button>
        <button className="btn-danger" onClick={()=>onConfirm(id, reason)}>Confirm Lost</button>
      </div>
    </Modal>
  )
}
