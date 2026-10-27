'use client'

// "Report this": goes to the Netlify Form `report` (public/__forms.html), which emails the site owner.

import { useState } from 'react'

export default function ReportLink({ what, url }: { what: string; url: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('sending')
    const body = new URLSearchParams({ 'form-name': 'report', what, url, reason, company: '' })
    try {
      const res = await fetch('/__forms.html', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() })
      setState(res.ok ? 'sent' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'sent') return <p className="text-[14px] font-semibold">Thanks. We&apos;ll look at it.</p>
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="text-[14px] font-semibold text-muted hover:text-fire">Report this {what}</button>
  return (
    <form onSubmit={send} className="space-y-2">
      <label htmlFor="report-reason" className="label">What&apos;s wrong with this {what}?</label>
      <textarea id="report-reason" required value={reason} onChange={e => setReason(e.target.value)} rows={3} maxLength={1000} className="field" />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={state === 'sending'} className="btn btn-dark !py-2">Send report</button>
        <button type="button" onClick={() => setOpen(false)} className="text-[14px] font-semibold text-muted">Cancel</button>
      </div>
      {state === 'error' && <p role="alert" className="text-[14px] font-semibold text-fire">The report didn&apos;t send. Try again in a minute.</p>}
    </form>
  )
}
