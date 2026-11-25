import { useState } from 'react'
import { Field, Modal } from './ui.jsx'

// Approve / verify / reject dialog. Rejection always needs a reason; approval may show a summary.
export default function ReviewModal({ title, summary, approveLabel = 'Approve', rejectLabel = 'Reject', allowApprove = true, blockReason, onApprove, onReject, onClose }) {
  const [remarks, setRemarks] = useState('')
  const [err, setErr] = useState('')
  return (
    <Modal title={title} onClose={onClose} size="sm" footer={<>
      <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
      <button type="button" className="btn btn-ghost danger" onClick={() => {
        if (!remarks.trim()) { setErr('Give a reason for rejecting'); return }
        onReject(remarks.trim()); onClose()
      }}>{rejectLabel}</button>
      {allowApprove && <button type="button" className="btn btn-primary" disabled={!!blockReason} onClick={() => { onApprove(remarks.trim()); onClose() }}>{approveLabel}</button>}
    </>}>
      {summary}
      {blockReason && <div className="form-error">{blockReason}</div>}
      <Field label="Remarks" error={err} hint="Required when rejecting">
        <textarea className="input" rows={3} value={remarks} onChange={(e) => { setRemarks(e.target.value); setErr('') }} />
      </Field>
    </Modal>
  )
}

export const nextNo = (rows, field, prefix) => {
  const n = rows.filter((r) => r[field]?.startsWith(prefix)).map((r) => Number(r[field].slice(prefix.length)) || 0)
  return prefix + String(Math.max(0, ...n) + 1).padStart(4, '0')
}
