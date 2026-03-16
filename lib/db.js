import { kv } from '@vercel/kv'

const KEYS = {
  tenders: 'est:tenders',
  clients: 'est:clients',
  revisions: 'est:revisions',
  approvals: 'est:approvals',
  counter: 'est:counter',
}

const DEFAULT_DATA = {
  tenders: [
    { id:'PRO1039', name:'Westfield Office Fitout', client:'Westfield Group', status:'Won', value:1250000, margin:18, estimator:'Sarah K.', revision:'C', dueDate:'2025-11-15', created:'2025-09-01', approvalStatus:'Approved', lossReason:'' },
    { id:'PRO1040', name:'Metro Rail Depot Upgrade', client:'Metro Infrastructure', status:'Approval Required', value:875000, margin:14, estimator:'Tom B.', revision:'A', dueDate:'2026-04-01', created:'2026-01-10', approvalStatus:'Pending', lossReason:'' },
    { id:'PRO1041', name:'Bayside Retail Strip', client:'Coastal Retail Co.', status:'In Progress', value:340000, margin:22, estimator:'Sarah K.', revision:'B', dueDate:'2026-03-28', created:'2026-02-05', approvalStatus:'N/A', lossReason:'' },
    { id:'PRO1042', name:'City Council Admin Block', client:'City Council', status:'Submitted / Pending', value:620000, margin:16, estimator:'Tom B.', revision:'A', dueDate:'2026-02-28', created:'2026-01-20', approvalStatus:'N/A', lossReason:'' },
    { id:'PRO1038', name:'Parklands Community Hub', client:'Parks & Rec Dept.', status:'Lost', value:480000, margin:12, estimator:'Dan R.', revision:'A', dueDate:'2025-12-01', created:'2025-10-01', approvalStatus:'N/A', lossReason:'Budget cut by client' },
  ],
  clients: [
    { name:'Westfield Group', contact:'Peter S.', email:'p.smith@westfield.com' },
    { name:'Metro Infrastructure', contact:'Jane L.', email:'j.lee@metro.gov.au' },
    { name:'Coastal Retail Co.', contact:'Mark H.', email:'m.hall@coastal.com' },
    { name:'City Council', contact:'Admin', email:'tenders@council.gov.au' },
    { name:'Parks & Rec Dept.', contact:'Lisa M.', email:'l.moore@parks.gov.au' },
  ],
  revisions: [
    { proId:'PRO1039', rev:'C', file:'Tender_REV-C.docx', date:'2025-11-10', estimator:'Sarah K.', value:1250000, note:'Final submission' },
    { proId:'PRO1039', rev:'B', file:'Tender_REV-B.docx', date:'2025-10-22', estimator:'Sarah K.', value:1180000, note:'Scope increase - add level 4' },
    { proId:'PRO1039', rev:'A', file:'Tender_REV-A.docx', date:'2025-09-25', estimator:'Sarah K.', value:1100000, note:'Initial submission' },
    { proId:'PRO1040', rev:'A', file:'Tender_REV-A.docx', date:'2026-01-28', estimator:'Tom B.', value:875000, note:'First draft' },
    { proId:'PRO1041', rev:'B', file:'Tender_REV-B.docx', date:'2026-02-28', estimator:'Sarah K.', value:340000, note:'Revised after RFQ returns' },
    { proId:'PRO1042', rev:'A', file:'Tender_REV-A.docx', date:'2026-02-20', estimator:'Tom B.', value:620000, note:'Submitted to client' },
  ],
  approvals: [
    { proId:'PRO1039', name:'Westfield Office Fitout', value:1250000, approver:'Jim', status:'Approved', date:'2025-09-20', comments:'Margins look solid, proceed.' },
    { proId:'PRO1040', name:'Metro Rail Depot Upgrade', value:875000, approver:'Jim', status:'Pending', date:'', comments:'' },
  ],
  counter: 1042,
}

async function getOrInit(key, defaultVal) {
  try {
    const val = await kv.get(key)
    if (val !== null && val !== undefined) return val
    await kv.set(key, defaultVal)
    return defaultVal
  } catch {
    return defaultVal
  }
}

export async function getData() {
  const [tenders, clients, revisions, approvals, counter] = await Promise.all([
    getOrInit(KEYS.tenders, DEFAULT_DATA.tenders),
    getOrInit(KEYS.clients, DEFAULT_DATA.clients),
    getOrInit(KEYS.revisions, DEFAULT_DATA.revisions),
    getOrInit(KEYS.approvals, DEFAULT_DATA.approvals),
    getOrInit(KEYS.counter, DEFAULT_DATA.counter),
  ])
  return { tenders, clients, revisions, approvals, counter }
}

export async function setKey(key, value) {
  await kv.set(KEYS[key] || key, value)
}

export async function saveAll(data) {
  await Promise.all([
    kv.set(KEYS.tenders, data.tenders),
    kv.set(KEYS.clients, data.clients),
    kv.set(KEYS.revisions, data.revisions),
    kv.set(KEYS.approvals, data.approvals),
    kv.set(KEYS.counter, data.counter),
  ])
}
