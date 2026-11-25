// Initial front-end data, shaped exactly like the htms PostgreSQL tables (same table and column
// names). Reference data mirrors what is in the database today; the extra permission codes, roles,
// users and FY 2026-27 bills/collections are front-end demo data so every screen has something to show.
import { ZID, applyBillPlan, makeCollection, planBills } from './tax.js'

const T0 = '2026-07-01T09:00:00'
const ADMIN = 'alam@kcc.com'
const stamp = (extra = {}) => ({ zid: ZID, ztime: T0, zutime: T0, zemail: ADMIN, ...extra })

const zbusiness = [{
  zid: ZID, xshort: 'KCC', zorg: 'Khulna City Corporation', xtaxnum: '', xadd1: '', xadd2: '', xcity: 'Khulna',
  xstate: 'Khulna', xzip: '', xcountry: 'Bangladesh', xphone: '', xfax: '', xcontact: '', xemail: '', xurl: '',
  xdformat: 'dd/MM/yyyy', xdsep: '/', xcur: 'BDT', zactive: '1', ztime: T0, zutime: T0, zemail: ADMIN,
}]

const xsysconf = [{ zid: ZID, ztime: T0, zutime: T0, zemail: ADMIN, xemail: '', xsys: 'Windows', xdocdir: '' }]

const code = (xtype, xcode, xdescdet = '', xprops = '', xcodealt = '') => ({ ...stamp(), xtype, xcode, xdescdet, xprops, xcodealt, zactive: '1', xteam: '' })
const xcodes = [
  code('Thana', 'Daulatpur'), code('Ward', '01'), code('Ward', '02'), code('Ward', '03'),
  code('TaxComponent', 'HOLDING', 'Holding Tax', '7', 'হোল্ডিং কর'),
  code('TaxComponent', 'CONSERVANCY', 'Conservancy Rate', '7', 'পরিচ্ছন্নতা রেইট'),
  code('TaxComponent', 'LIGHTING', 'Street Lighting Rate', '3', 'সড়ক বাতি রেইট'),
  code('Policy', 'REBATE_PCT', 'Rebate % for paying the full year in Q1', '10'),
  code('Policy', 'SURCHARGE_PCT', 'Surcharge % on overdue arrears', '5'),
  code('Policy', 'REPAIR_MONTHS', 'Months of rent allowed for repairs when assessing annual value', '2'),
  code('Policy', 'RATE_SQFT_MONTH', 'Standard monthly rental rate per sqft (area-rate assessment)', '0.35'),
  code('Policy', 'MUTATION_FEE', 'Ownership transfer (mutation) fee, BDT', '500'),
  code('TransferType', 'Sale', 'Sale deed'), code('TransferType', 'Inheritance', 'Inheritance / succession'),
  code('TransferType', 'Gift', 'Heba / gift deed'), code('TransferType', 'Court order', 'Court decree'),
  code('Occupancy', 'Owner', 'Owner occupied'), code('Occupancy', 'Tenant', 'Fully rented'), code('Occupancy', 'Mixed', 'Part owner, part rented'),
  code('PropType', 'পাকা', 'Pucca'), code('PropType', 'আধা-পাকা', 'Semi-pucca'), code('PropType', 'কাঁচা', 'Kutcha'), code('PropType', 'মিশ্র ব্যবহার', 'Mixed use'),
  code('PropUse', 'আবাসিক', 'Residential'), code('PropUse', 'বাণিজ্যিক', 'Commercial'), code('PropUse', 'শিক্ষা প্রতিষ্ঠান', 'Educational'), code('PropUse', 'ধর্মীয়', 'Religious'),
  code('TaxpayerType', 'প্রাইভেট', 'Private'), code('TaxpayerType', 'প্রতিষ্ঠান', 'Institution'), code('TaxpayerType', 'সরকারি', 'Government'),
  code('PayMode', 'Bank', 'Bank deposit'), code('PayMode', 'Cash', 'Counter cash'), code('PayMode', 'Mobile', 'Mobile financial service'),
  code('Bank', 'Sonali Bank PLC'), code('Bank', 'Janata Bank PLC'), code('Bank', 'Agrani Bank PLC'), code('Bank', 'Rupali Bank PLC'),
]

const perm = (xcode, xdesc, xrisk) => {
  const [xmodule, xresource, xaction] = xcode.split('.')
  return { zid: ZID, xcode, ztime: T0, zutime: T0, xmodule, xresource, xaction, xdesc, xrisk, zactive: 1 }
}
const zxperms = [
  // The 15 codes seeded in the database
  perm('settings.business.view', 'View business profile', 'LOW'), perm('settings.business.update', 'Edit business profile', 'HIGH'),
  perm('settings.roles.view', 'View roles', 'LOW'), perm('settings.roles.create', 'Create roles', 'HIGH'),
  perm('settings.roles.update', 'Edit roles and their permissions', 'HIGH'), perm('settings.roles.delete', 'Delete roles', 'CRITICAL'),
  perm('settings.system_config.view', 'View system configuration', 'LOW'), perm('settings.system_config.update', 'Edit system configuration', 'HIGH'),
  perm('settings.users.view', 'View users', 'LOW'), perm('settings.users.create', 'Create users', 'HIGH'),
  perm('settings.users.update', 'Edit users', 'HIGH'), perm('settings.users.delete', 'Delete users', 'CRITICAL'),
  perm('settings.users.override', 'Grant or deny a permission to one user', 'HIGH'),
  perm('settings.widgets.view', 'View dashboard widgets', 'LOW'), perm('settings.widgets.update', 'Configure dashboard widgets', 'MEDIUM'),
  // Front-end module codes (not yet in the database)
  perm('geo.location.view', 'View thana, wards and roads', 'LOW'), perm('geo.location.manage', 'Add, edit and delete thana, wards and roads', 'MEDIUM'),
  perm('geo.buildings.view', 'View buildings', 'LOW'), perm('geo.buildings.manage', 'Add, edit and delete buildings', 'MEDIUM'),
  perm('holding.taxpayers.view', 'View taxpayers', 'LOW'), perm('holding.taxpayers.manage', 'Add, edit and delete taxpayers', 'HIGH'),
  perm('holding.bills.view', 'View bills', 'LOW'), perm('holding.bills.generate', 'Generate and approve bills', 'HIGH'), perm('holding.bills.cancel', 'Cancel bills', 'CRITICAL'),
  perm('holding.collections.view', 'View collections', 'LOW'), perm('holding.collections.create', 'Record collections', 'HIGH'), perm('holding.collections.cancel', 'Cancel receipts', 'CRITICAL'),
  perm('holding.survey.view', 'View field surveys', 'LOW'), perm('holding.survey.manage', 'Record and edit field surveys', 'MEDIUM'), perm('holding.survey.verify', 'Verify or reject surveys', 'HIGH'),
  perm('holding.assessment.view', 'View assessments', 'LOW'), perm('holding.assessment.manage', 'Prepare assessments', 'MEDIUM'), perm('holding.assessment.approve', 'Approve assessments (changes annual value)', 'CRITICAL'),
  perm('holding.transfer.view', 'View ownership transfers', 'LOW'), perm('holding.transfer.manage', 'Record ownership transfer applications', 'MEDIUM'), perm('holding.transfer.approve', 'Approve ownership transfers (changes owner)', 'CRITICAL'),
]
const ALL = zxperms.map((p) => p.xcode)
const VIEW = ALL.filter((c) => c.endsWith('.view') && !c.startsWith('settings.'))

const zxrole = [
  { zid: ZID, xrole: 'SYSADMIN', ztime: T0, zutime: T0, xname: 'System Admin', xdesc: 'Full access', zactive: 1 },
  { zid: ZID, xrole: 'ASSESSOR', ztime: T0, zutime: T0, xname: 'Assessment Officer', xdesc: 'Registry, assessment and billing', zactive: 1 },
  { zid: ZID, xrole: 'COLLECTOR', ztime: T0, zutime: T0, xname: 'Collection Officer', xdesc: 'Records payments and issues receipts', zactive: 1 },
  { zid: ZID, xrole: 'VIEWER', ztime: T0, zutime: T0, xname: 'Read Only', xdesc: 'Can view, cannot change', zactive: 1 },
]
const grants = {
  SYSADMIN: ALL,
  ASSESSOR: [...VIEW, 'geo.location.manage', 'geo.buildings.manage', 'holding.taxpayers.manage', 'holding.bills.generate',
    'holding.survey.manage', 'holding.survey.verify', 'holding.assessment.manage', 'holding.transfer.manage'],
  COLLECTOR: [...VIEW, 'holding.collections.create'],
  VIEWER: VIEW,
}
const zxroleperm = Object.entries(grants).flatMap(([xrole, codes]) =>
  codes.map((xcode) => ({ zid: ZID, xrole, xcode, ztime: T0, xgrantedby: ADMIN })))

const user = (zemail, xname, xrole, xpassword, xmobile = '') => ({
  zid: ZID, zemail, xname, xrole, xpassword, xmobile, xphone: '', xaccess: '', zactive: '1', xlanguage: 'en', ztime: T0, zutime: T0,
})
// Demo-only passwords for the front end. The real system must check hashed passwords server-side.
const zxusers = [
  user(ADMIN, 'Alam', 'SYSADMIN', 'demo1234'),
  user('assessor@kcc.com', 'Assessment Desk', 'ASSESSOR', 'demo1234'),
  user('collector@kcc.com', 'Collection Desk', 'COLLECTOR', 'demo1234'),
]
const zxuserperm = []

const geo_thana = [{ ...stamp(), xthanaid: 1, xthana: 'Daulatpur', xdesc: 'দৌলতপুর থানা' }]
const geo_ward = [1, 2, 3].map((w) => ({ ...stamp(), xthanaid: 1, xwardid: w, xwardname: `Ward 0${w}`, xdesc: `ওয়ার্ড ০${w}` }))
const geo_road = [
  [1, 1, 'তেলিগাতী মেইন রোড', 'Teligati Main Road'], [1, 7, 'মহেশ্বরপাশা মেইন রোড', 'Maheshwarpasha Main Road'],
  [2, 13, 'যশোর রোড , রোড নং-1', 'Jessore Road, Road 1'], [2, 16, 'টি,বি,হাসপাতাল রোড, রোড নং-4', 'TB Hospital Road, Road 4'],
  [3, 2, 'কেদারনাথ মেইন রোড', 'Kedarnath Main Road'], [3, 725, 'কেদারনাথ ক্রস-1', 'Kedarnath Cross-1'],
].map(([xwardid, xroadid, xroadname, xdesc]) => ({ ...stamp(), xthanaid: 1, xwardid, xroadid, xroadname, xdesc }))

// The 20 sample taxpayers inserted into the database earlier (synthetic people).
const S = [
  [1, 1, 11, 'Md. Rafiqul Islam', 'মোঃ রফিকুল ইসলাম', 'Md. Abdul Karim', 'Nasrin Akter', 1450, 'পাকা', 'আবাসিক', 'প্রাইভেট', 4800, 3],
  [1, 1, 12, 'Shahana Begum', 'শাহানা বেগম', 'Abdur Rahman', 'Md. Jalal Uddin', 980, 'আধা-পাকা', 'আবাসিক', 'প্রাইভেট', 2100, 1],
  [1, 1, 13, 'Md. Kamrul Hasan', 'মোঃ কামরুল হাসান', 'Md. Nurul Hasan', 'Sharmin Sultana', 2200, 'মিশ্র ব্যবহার', 'বাণিজ্যিক', 'প্রাইভেট', 9600, 4],
  [1, 7, 21, 'Abul Kalam Azad', 'আবুল কালাম আজাদ', 'Md. Siddiqur Rahman', 'Rokeya Khatun', 1200, 'পাকা', 'আবাসিক', 'প্রাইভেট', 3600, 2],
  [1, 7, 22, 'Morium Nesa', 'মরিয়ম নেসা', 'Md. Habibur Rahman', null, 650, 'কাঁচা', 'আবাসিক', 'প্রাইভেট', 1250, 1],
  [1, 7, 23, 'Md. Sohel Rana', 'মোঃ সোহেল রানা', 'Md. Abul Hossain', 'Tania Akter', 1800, 'পাকা', 'আবাসিক', 'প্রাইভেট', 5400, 3],
  [1, 7, 24, 'Daulatpur Bazar Samity', 'দৌলতপুর বাজার সমিতি', null, null, 3200, 'পাকা', 'বাণিজ্যিক', 'প্রতিষ্ঠান', 14400, 2],
  [2, 13, 31, 'Md. Anisur Rahman', 'মোঃ আনিসুর রহমান', 'Md. Mofizur Rahman', 'Laila Arjumand', 1650, 'পাকা', 'আবাসিক', 'প্রাইভেট', 5000, 3],
  [2, 13, 32, 'Fatema Khatun', 'ফাতেমা খাতুন', 'Md. Ismail Sheikh', 'Md. Anwar Hossain', 900, 'আধা-পাকা', 'আবাসিক', 'প্রাইভেট', 1800, 1],
  [2, 13, 33, 'Md. Golam Mostafa', 'মোঃ গোলাম মোস্তফা', 'Md. Golam Rasul', 'Sabina Yasmin', 2600, 'মিশ্র ব্যবহার', 'বাণিজ্যিক', 'প্রাইভেট', 11200, 5],
  [2, 16, 41, 'Nazmul Huda', 'নাজমুল হুদা', 'Md. Shamsul Huda', 'Farzana Haque', 1350, 'পাকা', 'আবাসিক', 'প্রাইভেট', 4000, 2],
  [2, 16, 42, 'Ruksana Parvin', 'রুকসানা পারভীন', 'Md. Mokbul Hossain', 'Md. Shahidul Alam', 1100, 'পাকা', 'আবাসিক', 'প্রাইভেট', 3300, 2],
  [2, 16, 43, 'Md. Monirul Islam', 'মোঃ মনিরুল ইসলাম', 'Md. Siraj Uddin', 'Rehana Parvin', 720, 'কাঁচা', 'আবাসিক', 'প্রাইভেট', 1250, 1],
  [3, 2, 51, 'Md. Shafiqul Alam', 'মোঃ শফিকুল আলম', 'Md. Mojibur Rahman', 'Kohinur Begum', 1500, 'পাকা', 'আবাসিক', 'প্রাইভেট', 4500, 3],
  [3, 2, 52, 'Jahanara Begum', 'জাহানারা বেগম', 'Md. Ali Ahmed', null, 1000, 'আধা-পাকা', 'আবাসিক', 'প্রাইভেট', 2000, 1],
  [3, 2, 53, 'Md. Tariqul Islam', 'মোঃ তরিকুল ইসলাম', 'Md. Rafiq Uddin', 'Shirin Akter', 1900, 'মিশ্র ব্যবহার', 'আবাসিক', 'প্রাইভেট', 6200, 3],
  [3, 725, 61, 'Md. Babul Akter', 'মোঃ বাবুল আক্তার', 'Md. Kashem Ali', 'Salma Begum', 1250, 'পাকা', 'আবাসিক', 'প্রাইভেট', 3750, 2],
  [3, 725, 62, 'Kedarnath Primary School', 'কেদারনাথ প্রাথমিক বিদ্যালয়', null, null, 4200, 'পাকা', 'শিক্ষা প্রতিষ্ঠান', 'সরকারি', 0, 2],
  [3, 725, 63, 'Md. Liton Mia', 'মোঃ লিটন মিয়া', 'Md. Rashid Mia', 'Popy Akter', 850, 'আধা-পাকা', 'আবাসিক', 'প্রাইভেট', 1700, 1],
  [3, 725, 64, 'Hasina Akter', 'হাসিনা আক্তার', 'Md. Delwar Hossain', 'Md. Mizanur Rahman', 1550, 'পাকা', 'আবাসিক', 'প্রাইভেট', 4650, 3],
]
const roadName = (w, r) => geo_road.find((x) => x.xwardid === w && x.xroadid === r).xroadname
const mobile = (i) => '010000000' + String(i + 1).padStart(2, '0') // not an assigned BD prefix

const geo_building = S.map(([w, r, h, owner, ownerbn, parent, spouse, area, ptype, puse, , , flr], i) => ({
  ...stamp(), xthanaid: 1, xwardid: w, xroadid: r, xholdid: h, xholdname: `Holding ${String(h).padStart(4, '0')}`,
  xtype: 'Main', xstype: ptype, xflr_count: flr, xarea: area, xusage: puse, xcatbuild: '', xowner: owner, xownerbn: ownerbn,
  xowner_parent: parent, xowner_spouse: spouse, xmobile: mobile(i), xstatus: 'Active', xemail: null, xlatitude: null, xlongitude: null,
}))

const geo_holding_taxpayer = S.map(([w, r, h, owner, ownerbn, parent, spouse, area, ptype, puse, tptype, annual], i) => ({
  ...stamp(), xtaxcode: `${String(w).padStart(2, '0')}-${String(r).padStart(3, '0')}-${String(h).padStart(4, '0')}-00`,
  xthanaid: 1, xwardid: w, xroadid: r, xholdid: h, xholdext: '00', xbuilding_notfound: false, xroadname: roadName(w, r),
  xhousename: `Holding ${String(h).padStart(4, '0')}`, xaddress: `${roadName(w, r)}, ওয়ার্ড ০${w}, দৌলতপুর, খুলনা`,
  xowner: owner, xownerbn: ownerbn, xguardian: parent, xspouse: spouse, xmobile: mobile(i), xnid: null, xemail: null,
  xarea: area, xproptype: ptype, xpropuse: puse, xtaxpayertype: tptype, xannual_value: annual, xstatus: 'Active',
}))

// Front-end tables for the survey → assessment → ownership workflow (not in the database yet).
const ASR = 'assessor@kcc.com'
const at = (d) => `${d}T10:30:00`
const survey = (no, date, w, r, h, xtaxcode, xstructure, xflr_count, xarea, xusage, xoccupancy, xrented_area, xmonthly_rent, xstatus, xremarks = '') => ({
  zid: ZID, xsurveyno: `SV-2627-${no}`, xdate: date, xsurveyor: ASR, xthanaid: 1, xwardid: w, xroadid: r, xholdid: h, xtaxcode,
  xstructure, xflr_count, xarea, xusage, xoccupancy, xrented_area, xmonthly_rent, xlatitude: null, xlongitude: null, xremarks, xstatus,
  xverified_by: ['Verified', 'Rejected'].includes(xstatus) ? ADMIN : null, xverified_at: ['Verified', 'Rejected'].includes(xstatus) ? at(date) : null,
  ztime: at(date), zutime: at(date), zemail: ASR,
})
const geo_survey = [
  survey('0001', '2026-06-08', 1, 1, 11, '01-001-0011-00', 'পাকা', 3, 1450, 'আবাসিক', 'Owner', 0, 480, 'Verified'),
  survey('0002', '2026-11-02', 1, 1, 13, '01-001-0013-00', 'মিশ্র ব্যবহার', 4, 2200, 'বাণিজ্যিক', 'Mixed', 1200, 1080, 'Verified', 'Ground floor now let as shops'),
  survey('0003', '2026-06-12', 2, 13, 31, '02-013-0031-00', 'পাকা', 3, 1650, 'আবাসিক', 'Owner', 0, 500, 'Verified'),
  survey('0004', '2026-11-18', 3, 725, 65, null, 'আধা-পাকা', 1, 780, 'আবাসিক', 'Tenant', 780, 260, 'Submitted', 'New structure, not in building registry'),
  survey('0005', '2026-11-21', 2, 16, 42, '02-016-0042-00', 'পাকা', 2, 1100, 'আবাসিক', 'Owner', 0, null, 'Draft'),
  survey('0006', '2026-10-15', 3, 2, 53, '03-002-0053-00', 'মিশ্র ব্যবহার', 3, 1900, 'আবাসিক', 'Mixed', 600, null, 'Rejected', 'Owner absent; revisit needed'),
]
const assess = (no, date, xtaxcode, xsurveyno, xmethod, rent, area, rate, prev, xstatus, xremarks = '') => {
  const monthly = xmethod === 'Area rate' ? area * rate : rent
  return {
    zid: ZID, xassessno: `AS-2627-${no}`, xtaxcode, xsurveyno, xdate: date, xeffective_fyear: '2026-2027', xmethod,
    xmonthly_rent: rent, xarea: area, xrate_sqft: rate, xrepair_months: 2, xannual_value: Math.round(monthly * 10), xprev_annual_value: prev,
    xstatus, xapproved_by: xstatus === 'Draft' ? null : ADMIN, xapproved_at: xstatus === 'Draft' ? null : at(date), xremarks,
    ztime: at(date), zutime: at(date), zemail: ASR,
  }
}
const geo_assessment = [
  assess('0001', '2026-06-15', '01-001-0011-00', 'SV-2627-0001', 'Rental', 480, 1450, null, 4500, 'Approved'),
  assess('0002', '2026-11-05', '01-001-0013-00', 'SV-2627-0002', 'Rental', 1080, 2200, null, 9600, 'Draft', 'Re-assessment after shops were let'),
  assess('0003', '2026-06-20', '02-013-0031-00', 'SV-2627-0003', 'Rental', 500, 1650, null, 4600, 'Approved'),
  assess('0004', '2026-10-16', '03-002-0053-00', 'SV-2627-0006', 'Area rate', null, 1900, 0.35, 6200, 'Rejected', 'Survey rejected; reassess after revisit'),
]
const transfer = (no, date, xtaxcode, xtype, from, fromBn, to, toBn, extra, xstatus, xremarks = '') => ({
  zid: ZID, xtransferno: `OT-2627-${no}`, xtaxcode, xdate: date, xtype, xdeedno: `${xtype === 'Sale' ? 'SD' : xtype === 'Gift' ? 'HB' : 'SC'}-${2026}-${no}`,
  xdeeddate: date, xregistry: 'Daulatpur Sub-Registry Office', xfrom_owner: from, xfrom_ownerbn: fromBn,
  xto_owner: to, xto_ownerbn: toBn, xto_guardian: extra.guardian ?? null, xto_spouse: extra.spouse ?? null, xto_mobile: extra.mobile ?? null,
  xto_nid: null, xto_email: null, xfee: 500, xstatus, xapproved_by: xstatus === 'Pending' ? null : ADMIN, xapproved_at: xstatus === 'Pending' ? null : at(date), xremarks,
  ztime: at(date), zutime: at(date), zemail: ASR,
})
const geo_ownership_transfer = [
  transfer('0001', '2026-08-10', '01-007-0021-00', 'Sale', 'Md. Hafizur Rahman', 'মোঃ হাফিজুর রহমান', 'Abul Kalam Azad', 'আবুল কালাম আজাদ', { guardian: 'Md. Siddiqur Rahman' }, 'Approved'),
  transfer('0002', '2026-11-12', '02-016-0042-00', 'Inheritance', 'Ruksana Parvin', 'রুকসানা পারভীন', 'Md. Shahidul Alam', 'মোঃ শহিদুল আলম', { guardian: 'Md. Abdul Alim', mobile: '01000000030' }, 'Pending'),
  transfer('0003', '2026-11-20', '01-001-0012-00', 'Gift', 'Shahana Begum', 'শাহানা বেগম', 'Tahmina Akter', 'তাহমিনা আক্তার', { guardian: 'Md. Jalal Uddin', mobile: '01000000031' }, 'Pending'),
  transfer('0004', '2026-09-05', '03-725-0063-00', 'Sale', 'Md. Liton Mia', 'মোঃ লিটন মিয়া', 'Md. Faruk Hossain', 'মোঃ ফারুক হোসেন', {}, 'Rejected', 'Deed copy not attested'),
]

export function buildSeed() {
  const db = {
    zbusiness, xsysconf, xcodes, zxperms, zxrole, zxroleperm, zxusers, zxuserperm, zxevents: [],
    geo_thana, geo_ward, geo_road, geo_building, geo_holding_taxpayer, geo_survey, geo_assessment, geo_ownership_transfer,
    geo_holding_bill: [], geo_holding_billdetail: [], geo_holding_billopt: [], geo_holding_collection: [],
  }
  const all = geo_holding_taxpayer.map((t) => t.xtaxcode)
  const fy = '2026-2027'
  const pay = (taxIdx, upto, date, paymode, i) => {
    const tc = all[taxIdx]
    const bill = db.geo_holding_bill.find((b) => b.xtaxcode === tc && b.xstatus === 'Issued')
    if (!bill) return
    const c = makeCollection(db, {
      bill, upto, date, paymode, actor: 'collector@kcc.com',
      bank: paymode === 'Bank' ? 'Sonali Bank PLC' : null, branch: paymode === 'Bank' ? 'Daulatpur' : null,
      trnref: paymode === 'Cash' ? null : `TRN${date.replace(/-/g, '')}${String(i).padStart(3, '0')}`,
    })
    c.ztime = c.zutime = `${date}T11:00:00`
    db.geo_holding_collection.push(c)
    db.geo_holding_bill = db.geo_holding_bill.map((b) => (b.xbillno === bill.xbillno ? { ...b, xstatus: 'Paid' } : b))
  }
  // Q1 bills, issued 1 July; 14 of 20 paid (three for the whole year, with rebate).
  applyBillPlan(db, planBills(db, { fyear: fy, quarter: 1, issueDate: '2026-07-01', taxcodes: all, actor: ADMIN }))
  db.geo_holding_bill.forEach((b) => (b.xapproved_by = ADMIN))
  ;[0, 3, 7].forEach((i, k) => pay(i, 4, `2026-07-${10 + k * 4}`, 'Bank', k))
  ;[1, 2, 4, 5, 6, 8, 9, 10, 11, 12, 13].forEach((i, k) => pay(i, 1, `2026-08-${String(3 + k * 2).padStart(2, '0')}`, k % 3 ? 'Bank' : 'Cash', k + 10))
  // Q2 bills, issued 1 October; unpaid Q1 bills roll into arrears with surcharge.
  applyBillPlan(db, planBills(db, { fyear: fy, quarter: 2, issueDate: '2026-10-01', taxcodes: all, actor: ADMIN }))
  db.geo_holding_bill.forEach((b) => (b.xapproved_by = b.xapproved_by || ADMIN))
  ;[1, 2, 4, 5, 9].forEach((i, k) => pay(i, 2, `2026-11-${String(4 + k * 3).padStart(2, '0')}`, k % 2 ? 'Mobile' : 'Bank', k + 40))
  db.zxevents.push({
    zid: ZID, xevent: 1, ztime: '2026-10-01T09:05:00', zemail: ADMIN, xkind: 'notice', xmodule: 'bills', xaction: 'generate',
    xtrnnum: null, xmessage: `Q2 2026-2027 bills generated for ${db.geo_holding_bill.filter((b) => b.xquarter === 2).length} holdings`, xpath: '/bills', xread: 0,
  })
  return db
}
