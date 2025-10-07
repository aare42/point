'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { getLocalizedText } from '@/lib/utils/multilingual'

interface Topic {
  id: string
  name: string | any
  localizedName?: string
  slug: string
  type: string
  description?: string | any
}

function CreateGoalPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { language } = useLanguage()
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    motto: '',
    deadline: '',
    topicIds: [] as string[]
  })

  useEffect(() => {
    fetchTopics()
  }, [language])

  useEffect(() => {
    // Pre-fill form data from URL parameters (when coming from goal template)
    const templateName = searchParams.get('name')
    const templateDescription = searchParams.get('description')
    const templateMotto = searchParams.get('motto')
    const templateTopicIds = searchParams.get('topicIds')

    if (templateName || templateDescription || templateMotto || templateTopicIds) {
      setFormData(prev => ({
        ...prev,
        name: templateName || prev.name,
        description: templateDescription || prev.description,
        motto: templateMotto || prev.motto,
        topicIds: templateTopicIds ? templateTopicIds.split(',') : prev.topicIds
      }))
    }
  }, [searchParams])

  const fetchTopics = async () => {
    try {
      const response = await fetch(`/api/topics?lang=${language}`)
      if (response.ok) {
        const data = await response.json()
        setTopics(data)
      }
    } catch (error) {
      console.error('Failed to fetch topics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert('Goal name is required')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          deadline: formData.deadline || null
        })
      })

      if (response.ok) {
        router.push('/student/goals')
        router.refresh() // Force refresh to show the new goal
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create goal')
      }
    } catch (error) {
      console.error('Error creating goal:', error)
      alert('Failed to create goal')
    } finally {
      setSaving(false)
    }
  }

  const toggleTopic = (topicId: string) => {
    setFormData(prev => ({
      ...prev,
      topicIds: prev.topicIds.includes(topicId)
        ? prev.topicIds.filter(id => id !== topicId)
        : [...prev.topicIds, topicId]
    }))
  }

  const getTopicIcon = (type: string) => {
    switch (type) {
      case 'THEORY': return '📚'
      case 'PRACTICE': return '⚙️'
      case 'PROJECT': return '🚀'
      default: return '❓'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading topics...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link 
              href="/student/goals"
              className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                🎯 Create New Goal
              </h1>
              <p className="text-gray-600">
                {searchParams.get('template') 
                  ? 'Creating goal from template - customize as needed'
                  : 'Define your learning objectives and track your progress'
                }
              </p>
              {searchParams.get('template') && (
                <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm text-indigo-700">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span>Form pre-filled from goal template. Feel free to modify any fields.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200">
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-2">
                  Goal Information
                </h3>
                
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Goal Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Master React Development"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Describe what you want to achieve..."
                  />
                </div>

                <div>
                  <label htmlFor="motto" className="block text-sm font-medium text-gray-700 mb-2">
                    Motivational Motto
                  </label>
                  <input
                    type="text"
                    id="motto"
                    value={formData.motto}
                    onChange={(e) => setFormData(prev => ({ ...prev, motto: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Building the future, one component at a time"
                  />
                </div>

                <div>
                  <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-2">
                    Target Deadline
                  </label>
                  <input
                    type="date"
                    id="deadline"
                    value={formData.deadline}
                    onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

              </div>

              {/* Topic Selection */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">
                    Select Topics ({formData.topicIds.length} selected)
                  </h3>
                  <div className="text-sm text-gray-500">
                    Choose the topics you want to master for this goal
                  </div>
                </div>

                {topics.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
                    {topics.map(topic => (
                      <div
                        key={topic.id}
                        onClick={() => toggleTopic(topic.id)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          formData.topicIds.includes(topic.id)
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <span className="text-2xl">{getTopicIcon(topic.type)}</span>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 text-sm">{topic.localizedName || getLocalizedText(topic.name, language)}</h4>
                            <p className="text-xs text-gray-500 capitalize mt-1">
                              {topic.type?.toLowerCase() || 'unknown'} Topic
                            </p>
                            {topic.description && (
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{getLocalizedText(topic.description, language)}</p>
                            )}
                          </div>
                          {formData.topicIds.includes(topic.id) && (
                            <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-4">📚</div>
                    <p>No topics available. <Link href="/admin/topics/new" className="text-indigo-600 hover:text-indigo-700">Create some topics first</Link>.</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <Link
                  href="/student/goals"
                  className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving || !formData.name.trim()}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {saving ? 'Creating...' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CreateGoalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>}>
      <CreateGoalPageContent />
    </Suspense>
  )
}