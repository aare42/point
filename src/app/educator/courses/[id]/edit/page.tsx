'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TopicType } from '@prisma/client'

interface Topic {
  id: string
  name: string
  slug: string
  type: TopicType
  description?: string
}

interface CourseTopic {
  topic: {
    id: string
    name: string
    slug: string
    type: TopicType
    description?: string
  }
}

interface Course {
  id: string
  name: string
  description?: string
  topics: CourseTopic[]
}

export default function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [courseId, setCourseId] = useState<string>('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([])
  const [allTopics, setAllTopics] = useState<Topic[]>([])
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [topicsLoading, setTopicsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setMounted(true)
    const resolveParams = async () => {
      const resolvedParams = await params
      setCourseId(resolvedParams.id)
      await Promise.all([fetchCourse(resolvedParams.id), fetchTopics()])
      setPageLoading(false)
    }
    resolveParams()
  }, [params])

  const fetchCourse = async (id: string) => {
    try {
      const response = await fetch(`/api/courses/${id}`)
      if (response.ok) {
        const courseData = await response.json()
        setCourse(courseData)
        setName(courseData.name)
        setDescription(courseData.description || '')
        setSelectedTopicIds(courseData.topics.map((ct: CourseTopic) => ct.topic.id))
      } else {
        alert('Course not found')
        router.push('/educator')
      }
    } catch (error) {
      console.error('Failed to fetch course:', error)
      alert('Failed to load course')
    }
  }

  const fetchTopics = async () => {
    try {
      const response = await fetch('/api/topics')
      if (response.ok) {
        const topics = await response.json()
        setAllTopics(topics)
      }
    } catch (error) {
      console.error('Failed to fetch topics:', error)
    } finally {
      setTopicsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description: description || undefined,
          topicIds: selectedTopicIds
        }),
      })

      if (response.ok) {
        router.push('/educator')
        router.refresh()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update course')
      }
    } catch (error) {
      console.error('Error updating course:', error)
      alert('Failed to update course')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/educator')
        router.refresh()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete course')
      }
    } catch (error) {
      console.error('Error deleting course:', error)
      alert('Failed to delete course')
    } finally {
      setDeleting(false)
    }
  }

  const toggleTopicSelection = (topicId: string) => {
    setSelectedTopicIds(prev => 
      prev.includes(topicId)
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    )
  }

  const filteredTopics = allTopics.filter(topic =>
    topic.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!mounted || pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading course...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!course) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <Link
              href="/educator"
              className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Course</h1>
              <p className="text-gray-600">Update course details and topics</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Course Details */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Course Details</h2>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center space-x-2"
              >
                {deleting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                <span>{deleting ? 'Deleting...' : 'Delete Course'}</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Course Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter course name..."
                  required
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Describe what students will learn in this course..."
                />
              </div>
            </div>
          </div>

          {/* Topic Selection */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Select Topics</h2>
              <div className="text-sm text-gray-600">
                {selectedTopicIds.length} topics selected
              </div>
            </div>

            {/* Search Topics */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {topicsLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-600">Loading topics...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {filteredTopics.map((topic) => (
                  <div
                    key={topic.id}
                    onClick={() => toggleTopicSelection(topic.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedTopicIds.includes(topic.id)
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm ${
                        topic.type === 'THEORY' ? 'bg-blue-500' :
                        topic.type === 'PRACTICE' ? 'bg-green-500' : 'bg-purple-500'
                      }`}>
                        {topic.type === 'THEORY' && '📚'}
                        {topic.type === 'PRACTICE' && '⚙️'}
                        {topic.type === 'PROJECT' && '🚀'}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{topic.name}</h3>
                        <p className="text-sm text-gray-500 capitalize">{topic.type.toLowerCase()}</p>
                        {topic.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{topic.description}</p>
                        )}
                      </div>
                      {selectedTopicIds.includes(topic.id) && (
                        <div className="text-indigo-600">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {filteredTopics.length === 0 && !topicsLoading && (
                  <div className="col-span-2 text-center py-8 text-gray-500">
                    {searchQuery ? `No topics found matching "${searchQuery}"` : 'No topics available'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <Link
              href="/educator"
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </Link>
            
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center space-x-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>{loading ? 'Updating...' : 'Update Course'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}