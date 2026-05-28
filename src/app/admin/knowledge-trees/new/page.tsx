'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewKnowledgeTreePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ name: '', slug: '', description: '' })

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setFormData(prev => ({ ...prev, name, slug: prev.slug === '' ? generateSlug(name) : prev.slug }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/admin/knowledge-trees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/admin/knowledge-trees')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create tree')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm max-w-2xl">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">🌳 Create Knowledge Tree</h1>
        <Link href="/admin/knowledge-trees" className="text-gray-600 hover:text-gray-900 text-sm">
          ← Back to Trees
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={handleNameChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., Web Development"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
            required
            pattern="[a-z0-9-]+"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., web-development"
          />
          <p className="text-xs text-gray-500 mt-1">Only lowercase letters, numbers, and hyphens</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Brief description of this knowledge domain..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/admin/knowledge-trees"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Tree'}
          </button>
        </div>
      </form>
    </div>
  )
}
