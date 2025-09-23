'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { getLocalizedText } from '@/lib/utils/multilingual'

interface Topic {
  id: string
  name: any // Multilingual object or string
  slug: string
  type: string
}

interface Vacancy {
  id: string
  name: any // Multilingual object or string
  createdAt: string
  author: {
    name?: string
    email: string
  }
  _count: {
    topics: number
  }
}

export default function AdminVacanciesPage() {
  const { language } = useLanguage()
  const [vacancies, setVacancies] = useState<Vacancy[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    topicIds: [] as string[]
  })

  useEffect(() => {
    Promise.all([
      fetchVacancies(),
      fetchTopics()
    ])
  }, [])

  const fetchVacancies = async () => {
    try {
      const response = await fetch('/api/admin/vacancies')
      if (response.ok) {
        const data = await response.json()
        setVacancies(data)
      }
    } catch (error) {
      console.error('Error fetching vacancies:', error)
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

  const handleCreateVacancy = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/admin/vacancies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchVacancies()
        setShowCreateForm(false)
        setFormData({
          name: '',
          topicIds: []
        })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create vacancy')
      }
    } catch (error) {
      console.error('Error creating vacancy:', error)
      alert('Failed to create vacancy')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteVacancy = async (id: string, name: any) => {
    const localizedName = getLocalizedText(name, language, 'Unknown')
    if (!confirm(`Are you sure you want to delete "${localizedName}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/vacancies/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchVacancies()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete vacancy')
      }
    } catch (error) {
      console.error('Error deleting vacancy:', error)
      alert('Failed to delete vacancy')
    }
  }

  const handleTopicToggle = (topicId: string) => {
    setFormData(prev => ({
      ...prev,
      topicIds: prev.topicIds.includes(topicId)
        ? prev.topicIds.filter(id => id !== topicId)
        : [...prev.topicIds, topicId]
    }))
  }

  const filteredVacancies = vacancies.filter(vacancy => {
    const localizedName = getLocalizedText(vacancy.name, language, '')
    return localizedName.toLowerCase().includes(search.toLowerCase()) ||
           vacancy.author.email.toLowerCase().includes(search.toLowerCase())
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading vacancies...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vacancy Management</h1>
          <p className="text-gray-600">Manage job vacancies - simple sets of required skill topics</p>
        </div>
        <div className="flex space-x-4">
          <Link
            href="/admin"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ← Back to Admin
          </Link>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showCreateForm ? 'Cancel' : '+ Add Vacancy'}
          </button>
        </div>
      </div>


      {/* Create Vacancy Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Create New Vacancy</h3>
          <form onSubmit={handleCreateVacancy} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vacancy Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. Full Stack Developer, Data Scientist"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Skills ({formData.topicIds.length} selected)
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3">
                {topics.map(topic => (
                  <label key={topic.id} className="flex items-center space-x-2 py-1">
                    <input
                      type="checkbox"
                      checked={formData.topicIds.includes(topic.id)}
                      onChange={() => handleTopicToggle(topic.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{getLocalizedText(topic.name, language, 'Unknown')}</span>
                    <span className="text-xs text-gray-500 uppercase bg-gray-100 px-1 rounded">
                      {topic.type}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Creating...' : 'Create Vacancy'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="flex justify-between items-center">
        <input
          type="text"
          placeholder="Search vacancies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="text-sm text-gray-500">
          {filteredVacancies.length} vacancies found
        </div>
      </div>

      {/* Vacancies Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vacancy Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Required Skills
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Author
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredVacancies.map((vacancy) => (
              <tr key={vacancy.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {getLocalizedText(vacancy.name, language, 'Unknown')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                    {vacancy._count.topics} skills
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>{vacancy.author.name || 'Unknown'}</div>
                  <div className="text-gray-500 text-xs">{vacancy.author.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(vacancy.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <Link
                    href={`/admin/vacancies/${vacancy.id}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDeleteVacancy(vacancy.id, vacancy.name)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredVacancies.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">No vacancies found</div>
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