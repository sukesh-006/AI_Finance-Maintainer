'use client'
import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Upload, FileText, CheckCircle, XCircle, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/utils'

export default function ImportPage() {
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const { data: history } = useQuery({
    queryKey: ['csv-history'],
    queryFn: () => api.get('/api/csv/history').then(r => r.data),
  })

  const { data: template } = useQuery({
    queryKey: ['csv-template'],
    queryFn: () => api.get('/api/csv/template').then(r => r.data),
  })

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) return toast.error('Only CSV files are accepted')
    setUploading(true)
    setResult(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const { data } = await api.post('/api/csv/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResult(data)
      qc.invalidateQueries({ queryKey: ['csv-history'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      toast.success(`Imported ${data.imported} transactions!`)
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Import failed')
    } finally {
      setUploading(false)
    }
  }

  const downloadTemplate = () => {
    if (!template) return
    const header = template.columns.join(',')
    const rows = template.example_rows.map((r: any) => template.columns.map((c: string) => r[c]).join(','))
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'financeai_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Import CSV</h1>
        <p className="text-gray-500 text-sm mt-0.5">Bulk import transactions from a spreadsheet</p>
      </div>

      {/* Drop zone */}
      <div
        className={`card border-2 border-dashed text-center py-14 cursor-pointer transition-colors ${dragging ? 'border-brand-500 bg-brand-500/5' : 'border-surface-border hover:border-brand-500/50'}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      >
        <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        {uploading ? (
          <div>
            <div className="w-12 h-12 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-medium">Importing transactions…</p>
          </div>
        ) : (
          <div>
            <Upload size={40} className="text-gray-600 mx-auto mb-4" />
            <p className="text-white font-medium mb-1">Drop your CSV file here</p>
            <p className="text-gray-500 text-sm">or click to browse</p>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className={`mt-4 p-4 rounded-xl border ${result.failed === 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
          <div className="flex items-center gap-2 mb-2">
            {result.failed === 0
              ? <CheckCircle size={16} className="text-emerald-400" />
              : <XCircle size={16} className="text-amber-400" />}
            <span className="font-medium text-white">Import complete</span>
          </div>
          <div className="text-sm text-gray-400">
            ✅ {result.imported} imported &nbsp;·&nbsp; ❌ {result.failed} failed
          </div>
          {result.errors?.length > 0 && (
            <div className="mt-2 space-y-1">
              {result.errors.map((e: string, i: number) => (
                <div key={i} className="text-xs text-red-400 font-mono">{e}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Template section */}
      <div className="mt-6 card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">CSV Format</h2>
          <button onClick={downloadTemplate} className="btn-secondary text-sm flex items-center gap-2">
            <Download size={14} /> Download template
          </button>
        </div>
        <div className="bg-surface rounded-lg p-4 font-mono text-xs text-gray-400 overflow-x-auto">
          <div className="text-brand-400 mb-2">{template?.columns.join(', ')}</div>
          {template?.example_rows.map((r: any, i: number) => (
            <div key={i} className="text-gray-500">
              {template.columns.map((c: string) => r[c]).join(', ')}
            </div>
          ))}
        </div>
        {template?.notes && (
          <p className="text-xs text-gray-500 mt-3">{template.notes}</p>
        )}
      </div>

      {/* History */}
      {history?.length > 0 && (
        <div className="mt-6 card">
          <h2 className="font-semibold text-white mb-4">Import History</h2>
          <div className="space-y-2">
            {history.map((h: any) => (
              <div key={h.id} className="flex items-center justify-between text-sm py-2 border-b border-surface-border last:border-0">
                <div className="flex items-center gap-2 text-gray-300">
                  <FileText size={14} className="text-gray-500" />
                  {h.filename}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="text-emerald-400">{h.rows_imported} imported</span>
                  {h.rows_failed > 0 && <span className="text-red-400">{h.rows_failed} failed</span>}
                  <span>{formatDate(h.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
