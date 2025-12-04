import { useState } from 'react'
import api from '../lib/api'
import { useI18nStore } from '../i18n'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { X, Users } from 'lucide-react'

interface Assignee {
  id: string
  name: string
  team: string | null
}

interface Props {
  assignees: Assignee[]
  onClose: () => void
  onSuccess: () => void
}

export default function BulkAssignModal({ assignees, onClose, onSuccess }: Props) {
  const { t } = useI18nStore()
  const [selectedAssignee, setSelectedAssignee] = useState<string>('')
  const [count, setCount] = useState<number>(250)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!selectedAssignee) {
      setError(t('selectAssigneePlaceholder'))
      return
    }

    if (count < 1 || count > 1000) {
      setError(t('assignCountRange'))
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await api.post('/inquiry-leads/bulk-assign', {
        assigneeId: selectedAssignee,
        count
      })

      if (response.data.success) {
        onSuccess()
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{t('bulkAssignTitle')}</h2>
              <p className="text-sm text-gray-500">{t('bulkAssignDesc')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Assignee Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('selectAssignee')}
            </label>
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">{t('selectAssigneePlaceholder')}</option>
              {assignees.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} {a.team ? `(${a.team})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Count Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('assignCount')}
            </label>
            <Input
              type="number"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 0)}
              min={1}
              max={1000}
              className="text-center text-lg font-semibold"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('assignCountHint')}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-xl">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t('assigning') : `${count}${t('assignButton')}`}
          </Button>
        </div>
      </div>
    </div>
  )
}

