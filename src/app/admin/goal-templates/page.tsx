'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface GoalTemplate {
  id: string
  name: string
  description?: string
  motto?: string
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name?: string
    email: string
    image?: string
  }
  topics: {
    topic: {
      id: string
      name: string
      type: 'THEORY' | 'PRACTICE' | 'PROJECT'
    }
  }[]
  _count: {
    topics: number
    goals: number
  }
}

interface Topic {
  id: string
  name: string
  type: 'THEORY' | 'PRACTICE' | 'PROJECT'
  description?: string
}

export default function AdminGoalTemplatesPage() {
  const [goalTemplates, setGoalTemplates] = useState<GoalTemplate[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingGoalTemplate, setEditingGoalTemplate] = useState<GoalTemplate | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    motto: '',
    topicIds: [] as string[]
  })

  useEffect(() => {
    fetchGoalTemplates()
    fetchTopics()
  }, [])

  const fetchGoalTemplates = async () => {
    try {
      const response = await fetch('/api/admin/goal-templates')
      if (response.ok) {
        const data = await response.json()
        setGoalTemplates(data)
      }
    } catch (error) {
      console.error('Error fetching goal templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTopics = async () => {
    try {
      const response = await fetch('/api/topics')
      if (response.ok) {
        const data = await response.json()
        setTopics(data)
      }
    } catch (error) {
      console.error('Error fetching topics:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = '/api/admin/goal-templates'
      const method = editingGoalTemplate ? 'PUT' : 'POST'
      const body = editingGoalTemplate 
        ? { ...formData, goalTemplateId: editingGoalTemplate.id }
        : formData

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        await fetchGoalTemplates()
        resetForm()
        alert(editingGoalTemplate ? 'Goal template updated successfully!' : 'Goal template created successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      alert('An error occurred. Please try again.')
    }
  }

  const resetForm = () => {
    setFormData({ name: '', description: '', motto: '', topicIds: [] })
    setShowCreateForm(false)
    setEditingGoalTemplate(null)
  }

  const handleEdit = (goalTemplate: GoalTemplate) => {
    setEditingGoalTemplate(goalTemplate)
    setFormData({
      name: goalTemplate.name,
      description: goalTemplate.description || '',
      motto: goalTemplate.motto || '',
      topicIds: goalTemplate.topics?.map(t => t.topic.id) || []
    })
    setShowCreateForm(true)
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

  const filteredGoalTemplates = goalTemplates.filter(template =>
    template.name.toLowerCase().includes(search.toLowerCase()) ||
    template.description?.toLowerCase().includes(search.toLowerCase()) ||
    template.author.name?.toLowerCase().includes(search.toLowerCase()) ||
    template.author.email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading goal templates...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Goal Templates</h1>
              <p className="text-gray-600 mt-1">Manage reusable goal templates for students</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/admin"
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
              >
                ← Back to Admin
              </Link>
              <button
                onClick={() => {
                  resetForm()
                  setShowCreateForm(true)
                }}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                Create Template
              </button>
            </div>
          </div>
        </div>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingGoalTemplate ? 'Edit Goal Template' : 'Create New Goal Template'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivational Motto
                </label>
                <input
                  type="text"
                  value={formData.motto}
                  onChange={(e) => setFormData({ ...formData, motto: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Why should students pursue this goal?"
                />
              </div>

              {/* Topic Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Topics ({formData.topicIds.length} selected)
                  </label>
                  <div className="text-xs text-gray-500">
                    Choose topics that students should master for this goal
                  </div>
                </div>
                
                {topics.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto border border-gray-200 rounded-md p-3">
                    {topics.map(topic => (
                      <div
                        key={topic.id}
                        onClick={() => toggleTopic(topic.id)}
                        className={`p-3 rounded-md border-2 cursor-pointer transition-all text-sm ${
                          formData.topicIds.includes(topic.id)
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start space-x-2">
                          <span className="text-lg">{getTopicIcon(topic.type)}</span>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 text-sm truncate">{topic.name}</h4>
                            <p className="text-xs text-gray-500 capitalize mt-1">
                              {topic.type?.toLowerCase() || 'unknown'} Topic
                            </p>
                            {topic.description && (
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{topic.description}</p>
                            )}
                          </div>
                          {formData.topicIds.includes(topic.id) && (
                            <svg className="w-4 h-4 text-indigo-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-md">
                    <div className="text-3xl mb-2">📚</div>
                    <p className="text-sm">No topics available. Create some topics first.</p>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
                >
                  {editingGoalTemplate ? 'Update Template' : 'Create Template'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search goal templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Goal Templates List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Goal Templates ({filteredGoalTemplates.length})
            </h2>
          </div>
          
          {filteredGoalTemplates.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              {search ? 'No goal templates found matching your search.' : 'No goal templates created yet.'}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredGoalTemplates.map((template) => (
                <div key={template.id} className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {template.name}
                        </h3>
                        <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
                          {template._count.topics} topics
                        </span>
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          {template._count.goals} goals created
                        </span>
                      </div>
                      
                      {template.description && (
                        <p className="text-gray-600 mb-2">{template.description}</p>
                      )}
                      
                      {template.motto && (
                        <p className="text-sm text-indigo-600 italic mb-2">"{template.motto}"</p>
                      )}
                      
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <span>By {template.author.name || template.author.email}</span>
                        <span>Created {new Date(template.createdAt).toLocaleDateString()}</span>
                        <span>Updated {new Date(template.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(template)}
                        className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded border border-indigo-300"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                  
                  {template.topics.length > 0 && (
                    <div className="mt-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">Topics:</div>
                      <div className="flex flex-wrap gap-2">
                        {template.topics.map((topicRel) => (
                          <span
                            key={topicRel.topic.id}
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              topicRel.topic.type === 'THEORY' ? 'bg-blue-100 text-blue-800' :
                              topicRel.topic.type === 'PRACTICE' ? 'bg-green-100 text-green-800' :
                              'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {topicRel.topic.type === 'THEORY' && '📚'}
                            {topicRel.topic.type === 'PRACTICE' && '⚙️'}
                            {topicRel.topic.type === 'PROJECT' && '🚀'}
                            {topicRel.topic.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}