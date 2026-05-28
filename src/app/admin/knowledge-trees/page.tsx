'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface KnowledgeTree {
  id: string
  name: string
  slug: string
  description: string | null
  isActive: boolean
  createdAt: string
  _count: { topics: number }
}

export default function AdminKnowledgeTreesPage() {
  const [trees, setTrees] = useState<KnowledgeTree[]>([])
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(false)
  const [initResult, setInitResult] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTrees()
  }, [])

  const fetchTrees = async () => {
    try {
      const res = await fetch('/api/admin/knowledge-trees')
      if (!res.ok) throw new Error('Failed to fetch trees')
      setTrees(await res.json())
    } catch {
      setError('Failed to load knowledge trees')
    } finally {
      setLoading(false)
    }
  }

  const handleInit = async () => {
    if (!confirm('This will create the "General" tree and assign all unassigned topics to it. Continue?')) return
    try {
      setInitializing(true)
      setInitResult(null)
      const res = await fetch('/api/admin/knowledge-trees/init', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setInitResult(`✅ ${data.message}`)
      fetchTrees()
    } catch (err) {
      setInitResult(`❌ ${err instanceof Error ? err.message : 'Init failed'}`)
    } finally {
      setInitializing(false)
    }
  }

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/knowledge-trees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !current }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTrees(trees.map(t => t.id === id ? { ...t, isActive: !current } : t))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update tree')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete tree "${name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/admin/knowledge-trees/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTrees(trees.filter(t => t.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete tree')
    }
  }

  if (loading) {
    return (
      <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center justify-center h-32 space-y-4">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="text-gray-600 font-medium">Loading knowledge trees...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20">
        <div className="p-8 border-b border-gray-200/50">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
                🌳 Knowledge Trees
              </h1>
              <p className="text-gray-600">Organize topics into domain-specific knowledge trees</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleInit}
                disabled={initializing}
                className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {initializing ? '⏳ Initializing...' : '⚡ Init General Tree'}
              </button>
              <Link
                href="/admin/knowledge-trees/new"
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <span>➕</span>
                <span>New Tree</span>
              </Link>
            </div>
          </div>

          {initResult && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">{initResult}</div>
          )}
        </div>

        {error && (
          <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">{error}</div>
        )}

        {trees.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-6">🌳</div>
            <div className="text-xl text-gray-600 mb-2">No knowledge trees yet</div>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Click <strong>Init General Tree</strong> to automatically create a default tree and assign your existing topics, or create a new tree manually.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={handleInit}
                disabled={initializing}
                className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                ⚡ Init General Tree
              </button>
              <Link
                href="/admin/knowledge-trees/new"
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium"
              >
                ➕ Create New Tree
              </Link>
            </div>
            {initResult && (
              <div className="mt-6 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 max-w-md mx-auto">{initResult}</div>
            )}
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trees.map(tree => (
              <div
                key={tree.id}
                className={`border rounded-xl p-6 transition-all hover:shadow-md ${
                  tree.isActive
                    ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="text-2xl">🌳</div>
                  <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">
                    /{tree.slug}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{tree.name}</h3>
                {tree.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{tree.description}</p>
                )}
                <div className="flex items-center justify-between mt-4">
                  <span className="inline-flex items-center gap-1.5 text-sm text-indigo-600 font-medium">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full"></span>
                    {tree._count.topics} topics
                  </span>
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() => handleToggleActive(tree.id, tree.isActive)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        tree.isActive ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                      title={tree.isActive ? 'Deactivate' : 'Activate (show to users)'}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        tree.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                    <Link
                      href={`/admin/knowledge-trees/${tree.id}`}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
                    >
                      ✏️ Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(tree.id, tree.name)}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
                {tree.isActive && (
                  <div className="mt-3 text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    Visible to users
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
