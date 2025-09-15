'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TopicType } from '@prisma/client'

interface TopicOption {
  id: string
  name: string
  slug: string
  type: TopicType
}

export default function NewTopicPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [availableTopics, setAvailableTopics] = useState<TopicOption[]>([])
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    type: 'THEORY' as TopicType,
    description: '',
    keypoints: '',
    prerequisiteIds: [] as string[],
  })

  useEffect(() => {
    fetchAvailableTopics()
  }, [])

  const fetchAvailableTopics = async () => {
    try {
      const response = await fetch('/api/topics')
      if (response.ok) {
        const topics = await response.json()
        setAvailableTopics(topics)
      }
    } catch (error) {
      console.error('Failed to fetch topics:', error)
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setFormData(prev => ({
      ...prev,
      name,
      slug: prev.slug === '' ? generateSlug(name) : prev.slug
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/topics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create topic')
      }

      router.push('/admin/topics')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create topic')
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

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Create New Topic</h1>
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
              onChange={handleNameChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Introduction to React"
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
              placeholder="e.g., introduction-to-react"
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
            placeholder="Brief description of the topic..."
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
            placeholder="List key learning points, one per line..."
          />
          <p className="text-xs text-gray-500 mt-1">Learning outcomes students should achieve</p>
        </div>

        {availableTopics.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prerequisites
            </label>
            <div className="border border-gray-300 rounded-md max-h-40 overflow-y-auto p-3">
              {availableTopics.filter(topic => topic.type !== 'PROJECT').map((topic) => (
                <label key={topic.id} className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    checked={formData.prerequisiteIds.includes(topic.id)}
                    onChange={() => togglePrerequisite(topic.id)}
                    className="mr-2 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    {topic.name} 
                    <span className="text-gray-500 ml-1">({topic.type})</span>
                  </span>
                </label>
              ))}
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
            {loading ? 'Creating...' : 'Create Topic'}
          </button>
        </div>
      </form>
    </div>
  )
}