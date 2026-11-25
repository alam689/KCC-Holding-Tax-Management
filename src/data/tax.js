// Holding-tax rules used by the front end. Rates and policy values live in xcodes so they can be
// edited from Settings → Codes:
//   xtype 'TaxComponent' : xcode, xdescdet = name, xcodealt = Bangla name, xprops = rate % of annual value
//   xtype 'Policy'       : REBATE_PCT, SURCHARGE_PCT (xprops = number)
// Fiscal year runs July–June: Q1 Jul–Sep, Q2 Oct–Dec, Q3 Jan–Mar, Q4 Apr–Jun.

export const ZID = 10
export const OPEN_BILL = ['Issued', 'Partial']

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100
export const money = (n) => (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const num = (n) => (Number(n) || 0).toLocaleString('en-IN')
export const short = (n) => {
  n = Number(n) || 0
  if (Math.abs(n) >= 1e7) return (n / 1e7).toFixed(2) + ' Cr'
  if (Math.abs(n) >= 1e5) return (n / 1e5).toFixed(2) + ' L'
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}
export const pad = (n, w) => String(n).padStart(w, '0')
export const today = () => new Date().toISOString().slice(0, 10)
export const nowTs = () => new Date().toISOString().slice(0, 19)
export const fmtDate = (d) => (d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
export const fmtTs = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')

export function fiscalYearOf(date = new Date()) {
  const d = new Date(date)
  const y = d.getFullYear()
  return d.getMonth() >= 6 ? `${y}-${y + 1}` : `${y - 1}-${y}`
}
export function quarterOf(date = new Date()) {
  const m = new Date(date).getMonth()
  return m >= 6 ? Math.floor((m - 6) / 3) + 1 : Math.floor(m / 3) + 3
}
export function quarterRange(fyear, q) {
  const y0 = Number(fyear.slice(0, 4))
  const sm = 6 + (q - 1) * 3
  const start = new Date(Date.UTC(y0 + Math.floor(sm / 12), sm % 12, 1))
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 3, 0))
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}
export const fyShort = (fy) => fy.slice(2, 4) + fy.slice(7, 9)
export function fiscalYears(center = fiscalYearOf(), before = 3, after = 1) {
  const y = Number(center.slice(0, 4))
  const out = []
  for (let i = y + after; i >= y - before; i--) out.push(`${i}-${i + 1}`)
  return out
}

export function policy(db) {
  const get = (code, dflt) => {
    const r = db.xcodes.find((c) => c.xtype === 'Policy' && c.xcode === code)
    return r ? Number(r.xprops) || 0 : dflt
  }
  return {
    rebatePct: get('REBATE_PCT', 10), surchargePct: get('SURCHARGE_PCT', 5),
    repairMonths: get('REPAIR_MONTHS', 2), rateSqft: get('RATE_SQFT_MONTH', 0.35), mutationFee: get('MUTATION_FEE', 500),
  }
}

// Annual value = monthly rental value × (12 − repair/maintenance allowance months).
// "Rental": monthly rent as surveyed. "Area rate": area × standard rate per sqft per month.
export function assessValue({ xmethod, xmonthly_rent, xarea, xrate_sqft, xrepair_months }) {
  const monthly = xmethod === 'Area rate' ? (Number(xarea) || 0) * (Number(xrate_sqft) || 0) : Number(xmonthly_rent) || 0
  const months = 12 - (Number(xrepair_months) || 0)
  return { monthly: round2(monthly), gross: round2(monthly * 12), annual: Math.round(monthly * months) }
}

export function taxComponents(db) {
  return db.xcodes
    .filter((c) => c.xtype === 'TaxComponent' && c.zactive !== '0')
    .map((c) => ({ code: c.xcode, name: c.xdescdet || c.xcode, namebn: c.xcodealt || '', rate: Number(c.xprops) || 0 }))
}
export const totalRate = (db) => round2(taxComponents(db).reduce((s, c) => s + c.rate, 0))

export function billDetailRows(annualValue, comps) {
  return comps.map((c, i) => {
    const annual = round2((annualValue * c.rate) / 100)
    const q = round2(Math.floor((annual / 4) * 100) / 100)
    return {
      xrow: i + 1, xcomponent: c.name, xcomponentbn: c.namebn, xrate: c.rate, xannual: annual,
      xq1: q, xq2: q, xq3: q, xq4: round2(annual - q * 3),
    }
  })
}

export const billDue = (b) => round2(b.xcurrent_total + b.xarrear + b.xsurcharge)

export function payOptions(bill, details, pol) {
  const out = []
  for (let n = bill.xquarter; n <= 4; n++) {
    let current = 0
    for (let k = bill.xquarter; k <= n; k++) current += details.reduce((s, d) => s + d[`xq${k}`], 0)
    current = round2(current)
    // Rebate for paying the whole year in the first quarter.
    const rebate = n === 4 && bill.xquarter === 1 ? round2((current * pol.rebatePct) / 100) : 0
    out.push({
      zid: ZID, xbillno: bill.xbillno, xupto_quarter: n, xcurrent: current, xrebate: rebate,
      xarrear: bill.xarrear, xsurcharge: bill.xsurcharge, xtotal: round2(current - rebate + bill.xarrear + bill.xsurcharge),
    })
  }
  return out
}

// Has this taxpayer already paid for this quarter through an earlier "up to quarter N" receipt?
export function coveredUpTo(db, taxcode, fyear) {
  let max = 0
  for (const c of db.geo_holding_collection) {
    if (c.xstatus !== 'Received') continue
    const b = db.geo_holding_bill.find((x) => x.xbillno === c.xbillno)
    if (b && b.xtaxcode === taxcode && b.xfyear === fyear) max = Math.max(max, c.xupto_quarter)
  }
  return max
}

export function nextBillNos(db, fyear, quarter) {
  const prefix = `HB-${fyShort(fyear)}-Q${quarter}-`
  let seq = db.geo_holding_bill.filter((b) => b.xbillno.startsWith(prefix)).length
  return () => prefix + pad(++seq, 5)
}
export function nextReceiptNo(db, fyear) {
  const prefix = `RC-${fyShort(fyear)}-`
  const seq = db.geo_holding_collection.filter((c) => c.xreceiptno.startsWith(prefix)).length
  return prefix + pad(seq + 1, 5)
}

// Dry-run bill generation. Returns the rows to insert plus what was skipped and why.
export function planBills(db, { fyear, quarter, issueDate, taxcodes, actor }) {
  const comps = taxComponents(db)
  const pol = policy(db)
  const nextNo = nextBillNos(db, fyear, quarter)
  const { end } = quarterRange(fyear, quarter)
  const plan = { bills: [], details: [], opts: [], carried: [], skipped: [] }
  const ts = nowTs()
  for (const tp of db.geo_holding_taxpayer.filter((t) => taxcodes.includes(t.xtaxcode))) {
    const skip = (reason) => plan.skipped.push({ taxpayer: tp, reason })
    if (tp.xstatus !== 'Active') { skip(`Taxpayer is ${tp.xstatus}`); continue }
    if (db.geo_holding_bill.some((b) => b.xtaxcode === tp.xtaxcode && b.xfyear === fyear && b.xquarter === quarter && b.xstatus !== 'Cancelled')) { skip('Already billed for this quarter'); continue }
    const cov = coveredUpTo(db, tp.xtaxcode, fyear)
    if (cov >= quarter) { skip(`Paid in advance up to Q${cov}`); continue }
    if (!(tp.xannual_value > 0)) { skip('Exempt (zero annual value)'); continue }
    if (!comps.length) { skip('No tax components configured'); continue }

    const details = billDetailRows(tp.xannual_value, comps)
    const current = round2(details.reduce((s, d) => s + d[`xq${quarter}`], 0))
    const open = db.geo_holding_bill.filter((b) => b.xtaxcode === tp.xtaxcode && OPEN_BILL.includes(b.xstatus))
    const arrear = round2(open.reduce((s, b) => s + billDue(b), 0))
    const overdue = open.some((b) => b.xlastdate < issueDate)
    const surcharge = overdue ? round2((arrear * pol.surchargePct) / 100) : 0
    const arrearFy = open.length ? open.map((b) => b.xfyear).sort()[0] : null
    const bill = {
      zid: ZID, xbillno: nextNo(), xtaxcode: tp.xtaxcode, xfyear: fyear, xquarter: quarter,
      xissuedate: issueDate, xlastdate: end, xannual_value: tp.xannual_value, xcurrent_total: current,
      xarrear_fyear: arrearFy, xarrear: arrear, xsurcharge: surcharge, xstatus: 'Issued',
      xprepared_by: actor, xapproved_by: null, ztime: ts, zutime: ts, zemail: actor,
    }
    plan.bills.push(bill)
    details.forEach((d) => plan.details.push({ zid: ZID, xbillno: bill.xbillno, ...d, ztime: ts, zemail: actor }))
    plan.opts.push(...payOptions(bill, details, pol))
    open.forEach((b) => plan.carried.push(b.xbillno))
  }
  return plan
}

export function applyBillPlan(d, plan) {
  d.geo_holding_bill = d.geo_holding_bill.map((b) => (plan.carried.includes(b.xbillno) ? { ...b, xstatus: 'Carried', zutime: nowTs() } : b))
  d.geo_holding_bill.push(...plan.bills)
  d.geo_holding_billdetail.push(...plan.details)
  d.geo_holding_billopt.push(...plan.opts)
}

export function makeCollection(db, { bill, upto, date, paymode, bank, branch, account, trnref, voucher, actor }) {
  const opt = db.geo_holding_billopt.find((o) => o.xbillno === bill.xbillno && o.xupto_quarter === upto)
  const ts = nowTs()
  return {
    zid: ZID, xreceiptno: nextReceiptNo(db, bill.xfyear), xbillno: bill.xbillno, xdate: date, xupto_quarter: upto,
    xcurrent: opt.xcurrent, xrebate: opt.xrebate, xarrear: opt.xarrear, xsurcharge: opt.xsurcharge, xtotal: opt.xtotal,
    xamount_words: amountInWords(opt.xtotal), xpaymode: paymode, xbank: bank || null, xbranch: branch || null,
    xaccount: account || null, xtrnref: trnref || null, xvoucher: voucher || null, xstatus: 'Received',
    ztime: ts, zutime: ts, zemail: actor,
  }
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
function words99(n) { return n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '') }
function words999(n) { return (n >= 100 ? ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' : '') : '') + (n % 100 ? words99(n % 100) : '') }
function wordsInt(n) {
  if (n === 0) return 'Zero'
  const parts = []
  const crore = Math.floor(n / 1e7); n %= 1e7
  const lakh = Math.floor(n / 1e5); n %= 1e5
  const thousand = Math.floor(n / 1e3); n %= 1e3
  if (crore) parts.push(wordsInt(crore) + ' Crore')
  if (lakh) parts.push(words99(lakh) + ' Lakh')
  if (thousand) parts.push(words99(thousand) + ' Thousand')
  if (n) parts.push(words999(n))
  return parts.join(' ')
}
export function amountInWords(amount) {
  const taka = Math.floor(amount)
  const paisa = Math.round((amount - taka) * 100)
  return `Taka ${wordsInt(taka)}${paisa ? ` and ${words99(paisa)} Paisa` : ''} Only`
}
