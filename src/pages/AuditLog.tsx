import React, { useEffect, useState } from 'react'
import { api } from '../api/client'
import { AuditEntry } from '../types'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { formatDate } from '../utils/format'

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/audit-logs').then((r) => setEntries(r.data))
  }, [])

  const filtered = entries.filter((e) =>
    e.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    e.field?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4 py-2">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Audit Log</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Full history of edits across customers and payments</p>
      </div>

      <Card>
        <CardHeader><CardTitle>All Changes</CardTitle></CardHeader>
        <CardContent>
          <input
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm mb-3"
            placeholder="Search by customer or field..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filtered.map((e) => (
              <div key={e.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Badge color={e.entity === 'Customer' ? 'blue' : 'purple'}>{e.entity}</Badge>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{e.customerName}</span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(e.dateTime)}</span>
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  Field <span className="font-medium">{e.field}</span> changed from{' '}
                  <span className="text-red-500 dark:text-red-400">{e.oldValue || '—'}</span> to{' '}
                  <span className="text-green-600 dark:text-green-400">{e.newValue || '—'}</span>
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">By {e.editedBy}{e.reason ? ` — ${e.reason}` : ''}</p>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">No audit entries yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
