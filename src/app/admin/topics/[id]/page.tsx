'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TopicType } from '@prisma/client'
import { useLanguage } from '@/contexts/LanguageContext'
import { getLocalizedText } from '@/lib/utils/multilingual'

interface Topic {
  id: string
  name: any // Multilingual
  slug: string
  type: TopicType
  description?: any // Multilingual
  keypoints: any // Multilingual
  prerequisites: {
    prerequisite: {
      id: string
      name: any // Multilingual
      slug: string
      type: TopicType
    }
  }[]
}

interface TopicOption {
  id: string
  name: any // Multilingual
  slug: string
  type: TopicType
}

export default function EditTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { language } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [availableTopics, setAvailableTopics] = useState<TopicOption[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<TopicType | 'ALL'>('ALL')
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    type: 'THEORY' as TopicType,
    description: '',
    keypoints: '',
    prerequisiteIds: [] as string[],
  })

  useEffect(() => {
    fetchTopic()
    fetchAvailableTopics()
  }, [resolvedParams.id])

  const fetchTopic = async () => {
    try {
      const response = await fetch(`/api/topics/${resolvedParams.id}`)
      if (!response.ok) throw new Error('Topic not found')
      
      const topic: Topic = await response.json()
      setFormData({
        name: getLocalizedText(topic.name, language, ''),
        slug: topic.slug,
        type: topic.type,
        description: getLocalizedText(topic.description, language, ''),
        keypoints: getLocalizedText(topic.keypoints, language, ''),
        prerequisiteIds: topic.prerequisites.map(p => p.prerequisite.id),
      })
    } catch (error) {
      alert('Failed to load topic')
      router.push('/admin/topics')
    } finally {
      setFetching(false)
    }
  }

  const fetchAvailableTopics = async () => {
    try {
      const response = await fetch('/api/topics')
      if (response.ok) {
        const topics = await response.json()
        setAvailableTopics(
          topics.filter((t: any) => t.id !== resolvedParams.id)
        )
      }
    } catch (error) {
      console.error('Failed to fetch topics:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/topics/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update topic')
      }

      router.push('/admin/topics')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update topic')
    } finally {
      setLoading(false)
    }
  }

  const togglePrerequisite = (topicId: string) => {
    setFormData(prev => ({
      ...prev,
      prerequisiteIds: prev.prerequisiteIds.includes(topicId)
        ? prev.prerequisiteIds.filter(id => id !== topicId)
        : [...prev.prerequisiteIds, topicId]
    }))
  }

  const removePrerequisite = (topicId: string) => {
    setFormData(prev => ({
      ...prev,
      prerequisiteIds: prev.prerequisiteIds.filter(id => id !== topicId)
    }))
  }

  const filteredTopics = availableTopics.filter(topic => {
    const topicName = getLocalizedText(topic.name, language, '').toLowerCase()
    const matchesSearch = topicName.includes(searchTerm.toLowerCase()) ||
                         topic.slug.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'ALL' || topic.type === typeFilter
    const canBePrerequisite = topic.type !== 'PROJECT' // Projects cannot be prerequisites for other topics
    return matchesSearch && matchesType && canBePrerequisite
  })

  const selectedTopics = availableTopics.filter(topic => 
    formData.prerequisiteIds.includes(topic.id)
  )

  const getTypeIcon = (type: TopicType) => {
    switch (type) {
      case 'THEORY': return '📚'
      case 'PRACTICE': return '⚙️'
      case 'PROJECT': return '🚀'
      default: return '📄'
    }
  }

  const getTypeColor = (type: TopicType) => {
    switch (type) {
      case 'THEORY': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'PRACTICE': return 'bg-green-100 text-green-800 border-green-200'
      case 'PROJECT': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (fetching) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-500">Loading topic...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Edit Topic</h1>
          <Link
            href="/admin/topics"
            className="text-gray-600 hover:text-gray-900"
          >
            Back to Topics
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
              Slug *
            </label>
            <input
              type="text"
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              required
              pattern="^[a-z0-9-]+$"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Only lowercase letters, numbers, and hyphens</p>
          </div>
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
            Type *
          </label>
          <select
            id="type"
            value={formData.type}
            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as TopicType }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="THEORY">Theory</option>
            <option value="PRACTICE">Practice</option>
            <option value="PROJECT">Project</option>
          </select>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="keypoints" className="block text-sm font-medium text-gray-700 mb-2">
            Key Points *
          </label>
          <textarea
            id="keypoints"
            rows={4}
            value={formData.keypoints}
            onChange={(e) => setFormData(prev => ({ ...prev, keypoints: e.target.value }))}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {availableTopics.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              🔗 Prerequisites
            </label>
            
            {/* Selected Prerequisites */}
            {selectedTopics.length > 0 && (
              <div className="mb-6">
                <div className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wider">
                  Selected Prerequisites ({selectedTopics.length})
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedTopics.map((topic) => (
                    <div
                      key={topic.id}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border ${getTypeColor(topic.type)} shadow-sm`}
                    >
                      <span>{getTypeIcon(topic.type)}</span>
                      <span>{getLocalizedText(topic.name, language)}</span>
                      <button
                        type="button"
                        onClick={() => removePrerequisite(topic.id)}
                        className="ml-1 hover:bg-red-100 hover:text-red-600 rounded-full p-1 transition-colors"
                        title="Remove prerequisite"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search and Filter */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    🔍 Search Topics
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name or slug..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    🏷️ Filter by Type
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as TopicType | 'ALL')}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="ALL">All Types</option>
                    <option value="THEORY">Theory</option>
                    <option value="PRACTICE">Practice</option>
                  </select>
                </div>
              </div>

              {/* Available Topics */}
              <div>
                <div className="text-xs font-medium text-gray-600 mb-3 flex items-center justify-between">
                  <span className="uppercase tracking-wider">Available Topics ({filteredTopics.length})</span>
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="text-indigo-600 hover:text-indigo-800 text-xs"
                    >
                      Clear search
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md bg-white">
                  {filteredTopics.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {filteredTopics.map((topic) => (
                        <label
                          key={topic.id}
                          className="flex items-center p-3 hover:bg-indigo-50 cursor-pointer transition-colors group"
                        >
                          <input
                            type="checkbox"
                            checked={formData.prerequisiteIds.includes(topic.id)}
                            onChange={() => togglePrerequisite(topic.id)}
                            className="mr-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex items-center space-x-3 flex-1">
                            <span className="text-lg">{getTypeIcon(topic.type)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 group-hover:text-indigo-900">
                                {getLocalizedText(topic.name, language)}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                /{topic.slug}
                              </div>
                            </div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(topic.type)}`}>
                              {topic.type}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <div className="text-4xl mb-2">🔍</div>
                      <div className="text-sm">
                        {searchTerm || typeFilter !== 'ALL' ? 'No topics match your search' : 'No topics available'}
                      </div>
                      {(searchTerm || typeFilter !== 'ALL') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm('')
                            setTypeFilter('ALL')
                          }}
                          className="mt-2 text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <Link
            href="/admin/topics"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Topic'}
          </button>
        </div>
      </form>
    </div>
  )
}