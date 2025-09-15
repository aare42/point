'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Topic {
  id: string
  name: string
  type: string
}

interface CourseTopic {
  topic: Topic
}

interface Educator {
  id: string
  name: string
  email: string
}

interface Course {
  id: string
  name: string
  description?: string
  createdAt: string
  educator: Educator
  topics: CourseTopic[]
  _count: {
    topics: number
    enrollments: number
  }
}

export default function AdminCourseEditPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [courseId, setCourseId] = useState<string>('')
  const [course, setCourse] = useState<Course | null>(null)
  const [allEducators, setAllEducators] = useState<Educator[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    educatorId: ''
  })

  useEffect(() => {
    setMounted(true)
    const resolveParams = async () => {
      const resolvedParams = await params
      setCourseId(resolvedParams.id)
      await Promise.all([
        fetchCourse(resolvedParams.id),
        fetchEducators()
      ])
    }
    resolveParams()
  }, [params])

  const fetchCourse = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/courses/${id}`)
      if (response.ok) {
        const courseData = await response.json()
        setCourse(courseData)
        setFormData({
          name: courseData.name,
          description: courseData.description || '',
          educatorId: courseData.educator.id
        })
      } else if (response.status === 404) {
        router.push('/admin/courses')
      } else {
        console.error('Failed to fetch course')
      }
    } catch (error) {
      console.error('Error fetching course:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEducators = async () => {
    try {
      const response = await fetch('/api/admin/users?role=educator')
      if (response.ok) {
        const educators = await response.json()
        setAllEducators(educators)
      }
    } catch (error) {
      console.error('Error fetching educators:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const updatedCourse = await response.json()
        setCourse(updatedCourse)
        alert('Course updated successfully!')
      } else {
        const error = await response.json()
        alert(`Failed to update course: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating course:', error)
      alert('Failed to update course')
    } finally {
      setSaving(false)
    }
  }

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 font-medium">Course not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/admin/courses"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Course</h1>
          <p className="text-gray-600 mt-1">Modify course details and settings</p>
        </div>
      </div>

      {/* Course Info */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{course._count.topics}</div>
            <div className="text-sm text-gray-600">Topics</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{course._count.enrollments}</div>
            <div className="text-sm text-gray-600">Students</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {new Date(course.createdAt).toLocaleDateString()}
            </div>
            <div className="text-sm text-gray-600">Created</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Course Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Course Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Course description (optional)"
            />
          </div>

          {/* Educator */}
          <div>
            <label htmlFor="educatorId" className="block text-sm font-medium text-gray-700 mb-2">
              Educator
            </label>
            <select
              id="educatorId"
              value={formData.educatorId}
              onChange={(e) => setFormData({ ...formData, educatorId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              <option value="">Select an educator</option>
              {allEducators.map((educator) => (
                <option key={educator.id} value={educator.id}>
                  {educator.name} ({educator.email})
                </option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between">
            <Link
              href="/admin/courses"
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Course Topics */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Course Topics</h2>
          <Link
            href={`/educator/courses/${courseId}`}
            className="px-4 py-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            Manage Students
          </Link>
        </div>
        
        {course.topics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {course.topics.map(({ topic }) => (
              <div key={topic.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{topic.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {topic.type === 'THEORY' && '📚 Theory'}
                      {topic.type === 'PRACTICE' && '🔧 Practice'}
                      {topic.type === 'PROJECT' && '🚀 Project'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📝</div>
            <p className="text-gray-600">No topics added to this course yet</p>
          </div>
        )}
      </div>
    </div>
  )
}