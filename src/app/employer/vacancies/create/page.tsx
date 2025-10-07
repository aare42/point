'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface Topic {
  id: string
  name: string
  slug: string
  type: string
  localizedName: string
}

export default function CreateVacancyPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [topics, setTopics] = useState<Topic[]>([])
  const [filteredTopics, setFilteredTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    topicIds: [] as string[]
  })

  useEffect(() => {
    fetchTopics()
  }, [])

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredTopics(topics)
    } else {
      setFilteredTopics(
        topics.filter(topic => 
          topic.localizedName.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }
  }, [searchTerm, topics])

  const fetchTopics = async () => {
    try {
      const response = await fetch('/api/topics?lang=uk')
      if (response.ok) {
        const data = await response.json()
        setTopics(data)
        setFilteredTopics(data)
      }
    } catch (error) {
      console.error('Error fetching topics:', error)
    } finally {
      setLoading(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/employer/vacancies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        router.push('/employer')
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

  const getTopicIcon = (type: string) => {
    switch (type) {
      case 'THEORY': return '📚'
      case 'PRACTICE': return '⚙️'
      case 'PROJECT': return '🚀'
      default: return '📖'
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <p className="text-gray-600 font-medium">Please sign in to create a job posting.</p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading...</p>
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
          <Link
            href="/employer"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-4"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            💼 Post New Job
          </h1>
          <p className="text-gray-600">
            Create a job posting and specify the skills you're looking for in candidates.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Job Title */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Job Title
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="e.g. Senior Frontend Developer"
                required
              />
            </div>

            {/* Skills Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Skills
              </label>
              
              {/* Search */}
              <input
                type="text"
                placeholder="Search topics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors mb-4"
              />

              {/* Selected Topics Count */}
              {formData.topicIds.length > 0 && (
                <div className="mb-4 p-3 bg-indigo-50 rounded-lg">
                  <p className="text-sm text-indigo-700">
                    {formData.topicIds.length} skill{formData.topicIds.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              )}

              {/* Topics Grid */}
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredTopics.map((topic) => (
                    <div
                      key={topic.id}
                      onClick={() => handleTopicToggle(topic.id)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        formData.topicIds.includes(topic.id)
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getTopicIcon(topic.type)}</span>
                        <span className="text-sm font-medium">{topic.localizedName}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {filteredTopics.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No topics found matching "{searchTerm}"
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-6">
              <Link
                href="/employer"
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || !formData.name.trim() || formData.topicIds.length === 0}
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Creating...' : 'Post Job'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}