'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TopicType } from '@prisma/client'
import { useLanguage } from '@/contexts/LanguageContext'
import { getLocalizedText } from '@/lib/utils/multilingual'

interface KnowledgeTree {
  id: string
  name: string
  slug: string
}

interface Topic {
  id: string
  name: any
  slug: string
  type: TopicType
  description?: any
  createdAt: string
  treeId: string | null
  tree: KnowledgeTree | null
  author: { id: string; name: string; email: string }
  prerequisites: { prerequisite: { id: string; name: any; slug: string } }[]
  _count: { studentTopics: number; goalTopics: number; courseTopics: number }
}

export default function AdminTopicsPage() {
  const { language } = useLanguage()
  const [topics, setTopics] = useState<Topic[]>([])
  const [trees, setTrees] = useState<KnowledgeTree[]>([])
  const [selectedTreeId, setSelectedTreeId] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTrees()
  }, [])

  useEffect(() => {
    fetchTopics()
  }, [selectedTreeId])

  const fetchTrees = async () => {
    try {
      const res = await fetch('/api/knowledge-trees')
      if (res.ok) setTrees(await res.json())
    } catch {}
  }

  const fetchTopics = async () => {
    setLoading(true)
    try {
      const url = selectedTreeId === 'all'
        ? '/api/topics'
        : selectedTreeId === 'unassigned'
          ? '/api/topics?treeId='
          : `/api/topics?treeId=${selectedTreeId}`
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch topics')
      let data = await response.json()
      if (selectedTreeId === 'unassigned') {
        data = data.filter((t: Topic) => !t.treeId)
      }
      setTopics(data)
    } catch {
      setError('Failed to load topics')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this topic?')) return
    try {
      const response = await fetch(`/api/topics/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete topic')
      }
      setTopics(topics.filter(topic => topic.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete topic')
    }
  }

  const getTypeColor = (type: TopicType) => {
    switch (type) {
      case 'THEORY': return 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border border-blue-200'
      case 'PRACTICE': return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200'
      case 'PROJECT': return 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border border-purple-200'
      default: return 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center justify-center h-32 space-y-4">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="text-gray-600 font-medium">Loading knowledge topics...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20">
      <div className="p-8 border-b border-gray-200/50">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
              🧠 Knowledge Topics
            </h1>
            <p className="text-gray-600">Manage your learning graph and educational content</p>
          </div>
          <div className="flex items-center gap-3">
            {trees.length > 0 && (
              <select
                value={selectedTreeId}
                onChange={(e) => setSelectedTreeId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="all">🌳 All Trees</option>
                <option value="unassigned">⚪ Unassigned</option>
                {trees.map(tree => (
                  <option key={tree.id} value={tree.id}>{tree.name}</option>
                ))}
              </select>
            )}
            <Link
              href="/admin/topics/new"
              className="group flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <span className="text-lg group-hover:scale-110 transition-transform">➕</span>
              <span>Create Topic</span>
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="m-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl">
          <div className="flex items-center space-x-2">
            <span className="text-red-500 text-lg">⚠️</span>
            <div className="text-red-700 font-medium">{error}</div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200/50">
          <thead className="bg-gradient-to-r from-gray-50 to-indigo-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">📝 Topic</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">🌳 Tree</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">🏷️ Type</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">🔗 Prerequisites</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">📈 Usage</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">👤 Author</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">⚙️ Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white/50 backdrop-blur-sm divide-y divide-gray-200/50">
            {topics.map((topic) => (
              <tr key={topic.id} className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200">
                <td className="px-6 py-5">
                  <div>
                    <div className="text-sm font-bold text-gray-900">
                      {getLocalizedText(topic.name as any, language)}
                    </div>
                    <div className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-1 rounded-md inline-block mt-1">
                      /{topic.slug}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  {topic.tree ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                      🌳 {topic.tree.name}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Unassigned</span>
                  )}
                </td>
                <td className="px-6 py-5">
                  <span className={`inline-flex px-3 py-2 text-xs font-bold rounded-xl shadow-sm ${getTypeColor(topic.type)}`}>
                    {topic.type === 'THEORY' && '📚'}
                    {topic.type === 'PRACTICE' && '⚙️'}
                    {topic.type === 'PROJECT' && '🚀'}
                    {' '}{topic.type}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="text-sm text-gray-600">
                    {topic.prerequisites.length > 0 ? (
                      <div className="space-y-1">
                        {topic.prerequisites.slice(0, 2).map(p => (
                          <div key={p.prerequisite.id} className="text-xs bg-gray-100 px-2 py-1 rounded-md inline-block mr-1">
                            {getLocalizedText(p.prerequisite.name as any, language)}
                          </div>
                        ))}
                        {topic.prerequisites.length > 2 && (
                          <div className="text-xs text-gray-500">+{topic.prerequisites.length - 2} more</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">None</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex space-x-3 text-xs">
                    <div className="flex items-center space-x-1">
                      <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                      <span className="text-gray-600">{topic._count.studentTopics}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                      <span className="text-gray-600">{topic._count.goalTopics}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                      <span className="text-gray-600">{topic._count.courseTopics}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {(topic.author.name || topic.author.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 max-w-24 truncate">
                      {topic.author.name || topic.author.email}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex space-x-2">
                    <Link
                      href={`/admin/topics/${topic.id}`}
                      className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
                    >
                      ✏️ Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(topic.id)}
                      className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {topics.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="text-6xl mb-6">📚</div>
            <div className="text-xl text-gray-600 mb-2">
              {selectedTreeId === 'all' ? 'No knowledge topics yet' : 'No topics in this tree'}
            </div>
            <div className="text-gray-500 mb-8">
              {selectedTreeId === 'all'
                ? 'Start building your educational platform by creating your first topic'
                : 'Create a topic and assign it to this tree'}
            </div>
            <Link
              href="/admin/topics/new"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <span className="text-lg">✨</span>
              <span>Create your first topic</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
