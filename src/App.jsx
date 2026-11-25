import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import ComingSoon from './pages/ComingSoon.jsx'
import Layout from './components/Layout.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import { Thanas, Wards, Roads } from './pages/geo/Location.jsx'
import Buildings from './pages/geo/Buildings.jsx'
import Taxpayers from './pages/holding/Taxpayers.jsx'
import TaxpayerDetail from './pages/holding/TaxpayerDetail.jsx'
import Survey from './pages/holding/Survey.jsx'
import Assessment from './pages/holding/Assessment.jsx'
import Transfer from './pages/holding/Transfer.jsx'
import Bills from './pages/billing/Bills.jsx'
import GenerateBills from './pages/billing/GenerateBills.jsx'
import BillDetail from './pages/billing/BillDetail.jsx'
import Collections from './pages/collections/Collections.jsx'
import NewCollection from './pages/collections/NewCollection.jsx'
import ReceiptView from './pages/collections/ReceiptView.jsx'
import { Business, SystemConfig } from './pages/settings/Business.jsx'
import { Users, Overrides } from './pages/settings/Users.jsx'
import Roles from './pages/settings/Roles.jsx'
import Codes from './pages/settings/Codes.jsx'
import Activity from './pages/settings/Activity.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Home />} />
        <Route path="geo/thana" element={<Thanas />} />
        <Route path="geo/wards" element={<Wards />} />
        <Route path="geo/roads" element={<Roads />} />
        <Route path="buildings" element={<Buildings />} />
        <Route path="taxpayers" element={<Taxpayers />} />
        <Route path="taxpayers/:taxcode" element={<TaxpayerDetail />} />
        <Route path="survey" element={<Survey />} />
        <Route path="assessment" element={<Assessment />} />
        <Route path="transfer" element={<Transfer />} />
        <Route path="bills" element={<Bills />} />
        <Route path="bills/generate" element={<GenerateBills />} />
        <Route path="bills/:billno" element={<BillDetail />} />
        <Route path="collections" element={<Collections />} />
        <Route path="collections/new" element={<NewCollection />} />
        <Route path="collections/:receiptno" element={<ReceiptView />} />
        <Route path="settings/business" element={<Business />} />
        <Route path="settings/users" element={<Users />} />
        <Route path="settings/overrides" element={<Overrides />} />
        <Route path="settings/roles" element={<Roles />} />
        <Route path="settings/codes" element={<Codes />} />
        <Route path="settings/system" element={<SystemConfig />} />
        <Route path="settings/activity" element={<Activity />} />
        <Route path="*" element={<ComingSoon />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
