'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface KnowledgeTree {
  id: string
  name: string
  slug: string
  description: string | null
  _count: { topics: number }
}

export default function EditKnowledgeTreePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [formData, setFormData] = useState({ name: '', slug: '', description: '' })
  const [topicCount, setTopicCount] = useState(0)

  useEffect(() => {
    const fetchTree = async () => {
      try {
        const res = await fetch(`/api/admin/knowledge-trees/${id}`)
        if (!res.ok) throw new Error('Tree not found')
        const tree: KnowledgeTree = await res.json()
        setFormData({
          name: tree.name,
          slug: tree.slug,
          description: tree.description || '',
        })
        setTopicCount(tree._count.topics)
      } catch {
        alert('Failed to load tree')
        router.push('/admin/knowledge-trees')
      } finally {
        setFetching(false)
      }
    }
    fetchTree()
  }, [id, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/knowledge-trees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/admin/knowledge-trees')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update tree')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-center h-32">
        <div className="text-gray-500">Loading tree...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm max-w-2xl">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🌳 Edit Knowledge Tree</h1>
          <p className="text-sm text-gray-500 mt-0.5">{topicCount} topics in this tree</p>
        </div>
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
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
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
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
