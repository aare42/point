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

interface User {
  id: string
  name?: string
  email: string
}

export default function AdminGoalTemplatesPage() {
  const [goalTemplates, setGoalTemplates] = useState<GoalTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingGoalTemplate, setEditingGoalTemplate] = useState<GoalTemplate | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    motto: ''
  })

  useEffect(() => {
    fetchGoalTemplates()
  }, [])

  const fetchGoalTemplates = async () => {
    try {
      const response = await fetch('/api/admin/goal-templates')
      if (response.ok) {
        const data = await response.json()
        setGoalTemplates(data)
      }
    } catch (error) {
      console.error('Error fetching goals:', error)
    } finally {
      setLoading(false)
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
        const result = await response.json()
        console.log(result.message)
        await fetchGoalTemplates()
        resetForm()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save goal')
      }
    } catch (error) {
      console.error('Error saving goal:', error)
      alert('Failed to save goal')
    }
  }

  const handleDelete = async (goalId: string, goalName: string) => {
    if (!confirm(`Are you sure you want to delete the goal "${goalName}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/goals/${goalId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const result = await response.json()
        console.log(result.message)
        await fetchGoalTemplates()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete goal')
      }
    } catch (error) {
      console.error('Error deleting goal:', error)
      alert('Failed to delete goal')
    }
  }

  const handleEdit = (goal: GoalTemplate) => {
    setEditingGoalTemplate(goal)
    setFormData({
      name: goal.name,
      description: goal.description || '',
      motto: goal.motto || ''
    })
    setShowCreateForm(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      motto: ''
    })
    setEditingGoalTemplate(null)
    setShowCreateForm(false)
  }

  const togglePublic = async (goalId: string, isPublic: boolean) => {
    setUpdating(goalId)
    try {
      const response = await fetch(`/api/admin/goals/${goalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !isPublic })
      })

      if (response.ok) {
        setGoalTemplates(goalTemplates.map(g => 
          g.id === goalId ? { ...g, isPublic: !isPublic } : g
        ))
      } else {
        alert('Failed to update goal visibility')
      }
    } catch (error) {
      console.error('Error updating goal:', error)
      alert('Failed to update goal visibility')
    } finally {
      setUpdating(null)
    }
  }

  const getTopicTypeColor = (type: string) => {
    switch (type) {
      case 'THEORY': return 'bg-blue-100 text-blue-800'
      case 'PRACTICE': return 'bg-green-100 text-green-800'
      case 'PROJECT': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredGoals = goalTemplates.filter(goal => 
    goal.name.toLowerCase().includes(search.toLowerCase()) ||
    goal.author.name?.toLowerCase().includes(search.toLowerCase()) ||
    goal.author.email.toLowerCase().includes(search.toLowerCase()) ||
    goal.description?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading goals...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Goals Management</h1>
          <p className="text-gray-600">Manage student learning goals and objectives</p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Create Goal
          </button>
          <Link
            href="/admin/manage"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ← Back to Management
          </Link>
        </div>
      </div>


      {/* Search */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center">
          <input
            type="text"
            placeholder="Search goals by name, user, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="ml-4 text-sm text-gray-500">
            {filteredGoals.length} goals found
          </div>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingGoalTemplate ? 'Edit Goal' : 'Create New Goal'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Goal Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivational Motto
                </label>
                <input
                  type="text"
                  value={formData.motto}
                  onChange={(e) => setFormData({ ...formData, motto: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Why is this goal important?"
                />
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingGoalTemplate ? 'Update Goal' : 'Create Goal'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Goals Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Goal
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Owner
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Topics
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredGoals.map((goal) => (
              <tr key={goal.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{goal.name}</div>
                    {goal.description && (
                      <div className="text-sm text-gray-500 max-w-xs truncate">{goal.description}</div>
                    )}
                    {goal.motto && (
                      <div className="text-xs text-blue-600 italic">"{goal.motto}"</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {goal.author.image ? (
                      <img
                        src={goal.author.image}
                        alt={goal.author.name || goal.author.email}
                        className="w-8 h-8 rounded-full mr-3"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                        <span className="text-gray-600 text-xs font-medium">
                          {(goal.author.name || goal.author.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {goal.author.name || 'No name'}
                      </div>
                      <div className="text-sm text-gray-500">{goal.author.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    <span className="text-sm text-gray-700">{goal._count.topics} topics</span>
                    {goal.topics.slice(0, 3).map((gt) => (
                      <span
                        key={gt.topic.id}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTopicTypeColor(gt.topic.type)}`}
                      >
                        {gt.topic.type}
                      </span>
                    ))}
                    {goal.topics.length > 3 && (
                      <span className="text-xs text-gray-500">+{goal.topics.length - 3} more</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleEdit(goal)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(goal.id, goal.name)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredGoals.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">No goals found</div>
            {search && (
              <div className="text-gray-400 text-sm mt-2">
                Try adjusting your search terms
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}