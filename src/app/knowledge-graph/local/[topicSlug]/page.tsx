'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/contexts/LanguageContext'
import LocalKnowledgeGraph from '@/components/LocalKnowledgeGraph'
import { getLocalizedText } from '@/lib/utils/multilingual'

interface Topic {
  id: string
  name: any
  slug: string
  type: string
  description?: any
  keypoints?: any
  status?: string
}

export default function LocalKnowledgeGraphPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const { t, language } = useLanguage()
  const [centerTopic, setCenterTopic] = useState<Topic | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [prerequisites, setPrerequisites] = useState<any[]>([])
  const [effects, setEffects] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loadingRelations, setLoadingRelations] = useState(false)
  const lastFetchedTopicRef = useRef<string | null>(null)
  const [originalReferrer, setOriginalReferrer] = useState<string | null>(null)

  const topicSlug = params.topicSlug as string

  const statusLabels = {
    NOT_LEARNED: t('status.not_learned'),
    WANT_TO_LEARN: t('status.want_to_learn'),
    LEARNING: t('status.learning'),
    LEARNED: t('status.learned'),
    LEARNED_AND_VALIDATED: t('status.validated')
  }

  const allowedStatuses = ['NOT_LEARNED', 'WANT_TO_LEARN', 'LEARNING', 'LEARNED']

  // Store the original referrer (non-local-graph) for consistent back navigation
  useEffect(() => {
    const referrer = searchParams.get('from')
    
    if (referrer && !referrer.includes('/knowledge-graph/local/')) {
      // This is either the first visit or coming from a non-local-graph page
      setOriginalReferrer(referrer)
      // Store in sessionStorage for persistence across local graph navigation
      sessionStorage.setItem('localGraphOriginalReferrer', referrer)
    } else if (!originalReferrer) {
      // Check if we have a stored original referrer from previous navigation
      const storedReferrer = sessionStorage.getItem('localGraphOriginalReferrer')
      if (storedReferrer) {
        setOriginalReferrer(storedReferrer)
      }
    }
  }, [searchParams, originalReferrer])

  // Smart back navigation function
  const handleBackNavigation = () => {
    // Use original referrer for consistent navigation
    if (originalReferrer) {
      // If original referrer is from knowledge graph, go to global view centered on current topic
      if (originalReferrer.includes('/knowledge-graph')) {
        if (centerTopic) {
          router.push(`/knowledge-graph?center=${centerTopic.id}`)
        } else {
          router.push('/knowledge-graph')
        }
      } else {
        // Navigate back to the original non-local-graph page
        // Clear sessionStorage as we're leaving local graph context
        sessionStorage.removeItem('localGraphOriginalReferrer')
        router.push(originalReferrer)
      }
    } else {
      // Fallback to browser back or dashboard
      if (window.history.length > 1) {
        router.back()
      } else {
        // Final fallback
        router.push(session ? '/student' : '/')
      }
    }
  }

  // Get appropriate back button text based on original referrer
  const getBackButtonText = () => {
    // Use original referrer for consistent button text
    if (originalReferrer) {
      if (originalReferrer.includes('/courses/')) return 'Back to Course'
      if (originalReferrer.includes('/courses')) return 'Back to Courses'
      if (originalReferrer.includes('/vacancies')) return 'Back to Jobs'
      if (originalReferrer.includes('/goals')) return 'Back to Goals'
      if (originalReferrer.includes('/student')) return 'Back to Dashboard'
      if (originalReferrer.includes('/knowledge-graph')) return 'Back to Global View'
    }
    
    return session ? 'Back to Dashboard' : 'Back'
  }

  // Find topic by slug
  useEffect(() => {
    const fetchCenterTopic = async () => {
      try {
        setLoading(true)
        // First find topic by slug
        const response = await fetch(`/api/topics/public?lang=${language}`)
        if (response.ok) {
          const allTopics = await response.json()
          const topic = allTopics.find((t: Topic) => t.slug === topicSlug)
          if (topic) {
            setCenterTopic(topic)
            // Don't auto-select the center topic to prevent immediate sidebar fetching
            // setSelectedTopic(topic)
          } else {
            // Topic not found
            const referrer = searchParams.get('from')
            const redirectUrl = referrer ? `/knowledge-graph?from=${encodeURIComponent(referrer)}` : '/knowledge-graph'
            router.push(redirectUrl)
          }
        }
      } catch (error) {
        console.error('Failed to fetch center topic:', error)
        const referrer = searchParams.get('from')
        const redirectUrl = referrer ? `/knowledge-graph?from=${encodeURIComponent(referrer)}` : '/knowledge-graph'
        router.push(redirectUrl)
      } finally {
        setLoading(false)
      }
    }

    if (topicSlug) {
      fetchCenterTopic()
    }
  }, [topicSlug, language, router])

  // Update topic status
  const updateTopicStatus = async (topicId: string, newStatus: string) => {
    setUpdating(topicId)
    try {
      const response = await fetch('/api/student/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, status: newStatus }),
      })

      if (response.ok) {
        // Update selected topic if it's the one being updated
        if (selectedTopic?.id === topicId) {
          setSelectedTopic({ ...selectedTopic, status: newStatus })
        }
      } else {
        alert('Failed to update topic status')
      }
    } catch (error) {
      console.error('Error updating topic status:', error)
      alert('Failed to update topic status')
    } finally {
      setUpdating(null)
    }
  }

  // Handle topic selection
  const handleTopicSelect = useCallback((topic: Topic | null) => {
    setSelectedTopic(topic)
    if (!topic?.id) {
      setPrerequisites([])
      setEffects([])
      setCourses([])
      lastFetchedTopicRef.current = null
      return
    }
    
    // Only fetch if we haven't fetched this topic before
    if (lastFetchedTopicRef.current !== topic.id) {
      lastFetchedTopicRef.current = topic.id
      setLoadingRelations(true)
      
      // Fetch data directly without useCallback dependencies
      Promise.all([
        fetch(`/api/topics/public?lang=${language}`),
        fetch(`/api/courses?lang=${language}`)
      ]).then(async ([topicsRes, coursesRes]) => {
        try {
          if (topicsRes.ok) {
            const allTopics = await topicsRes.json()
            const selectedTopicData = allTopics.find((t: Topic) => t.id === topic.id)
            
            if (selectedTopicData) {
              // Prerequisites are already in the topic data
              setPrerequisites(selectedTopicData.prerequisites || [])
              
              // Find effects (topics that depend on this one)
              const effectsData = allTopics.filter((t: Topic) => 
                t.prerequisites?.some((p: any) => p.prerequisite.id === topic.id)
              )
              setEffects(effectsData)
            }
          }
          
          if (coursesRes.ok) {
            const allCourses = await coursesRes.json()
            const relevantCourses = allCourses.filter((course: any) => 
              course.topics?.some((ct: any) => ct.topic.id === topic.id)
            )
            setCourses(relevantCourses)
          }
        } catch (error) {
          console.error('Error fetching topic relations:', error)
          setPrerequisites([])
          setEffects([])
          setCourses([])
        } finally {
          setLoadingRelations(false)
        }
      })
    }
  }, [centerTopic?.id])

  // Handle recenter request
  const handleRecenter = (topicId: string) => {
    // Find topic to get its slug from local graph data first
    const findTopicSlug = () => {
      // Check if we have the topic data in the current local graph context
      // This should be available since the topic is visible on the graph
      
      // For now, use the direct API approach but make it simpler
      const fetchAndRedirect = async () => {
        try {
          console.log('Recentering on topic:', topicId)
          const response = await fetch(`/api/topics/public?lang=${language}`)
          if (response.ok) {
            const allTopics = await response.json()
            const topic = allTopics.find((t: Topic) => t.id === topicId)
            if (topic) {
              console.log('Found topic:', topic.name, 'slug:', topic.slug)
              // Pass original referrer to maintain consistent back navigation
              const referrerParam = originalReferrer ? `?from=${encodeURIComponent(originalReferrer)}` : ''
              router.push(`/knowledge-graph/local/${topic.slug}${referrerParam}`)
            } else {
              console.error('Topic not found with ID:', topicId)
            }
          }
        } catch (error) {
          console.error('Failed to find topic slug:', error)
        }
      }
      fetchAndRedirect()
    }
    findTopicSlug()
  }

  // Switch to global view
  const switchToGlobalView = () => {
    router.push('/knowledge-graph')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading local knowledge graph...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!centerTopic) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="text-6xl mb-6">❌</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Topic Not Found</h3>
            <p className="text-gray-600 mb-6">
              The topic you're looking for doesn't exist or has been removed.
            </p>
            <button
              onClick={() => {
                const referrer = searchParams.get('from')
                const redirectUrl = referrer ? `/knowledge-graph?from=${encodeURIComponent(referrer)}` : '/knowledge-graph'
                router.push(redirectUrl)
              }}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Return to Knowledge Graph
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  🎯 Local Knowledge Graph
                </h1>
                <p className="text-gray-600">
                  Focused view centered on: <strong>{getLocalizedText(centerTopic.name, language)}</strong>
                </p>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center space-x-4">
              {/* Smart Back Button */}
              <button
                onClick={handleBackNavigation}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>{getBackButtonText()}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Graph Container */}
        <div className="flex gap-6">
          {/* Main Graph */}
          <div className="flex-1 bg-white rounded-2xl shadow-xl p-6 border border-gray-200 relative">
            <LocalKnowledgeGraph
              centerTopicId={centerTopic.id}
              width={selectedTopic ? 800 : 1100}
              height={700}
              onTopicSelect={handleTopicSelect}
              onRecenter={handleRecenter}
              language={language}
            />
            
          </div>
          
          {/* Right Panel - Topic Details */}
          {selectedTopic && (
            <div className="w-80 bg-white rounded-2xl shadow-xl border border-gray-200">
              {/* Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-end mb-4">
                  <button
                    onClick={() => setSelectedTopic(null)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold bg-gray-600">
                    {selectedTopic.type === 'THEORY' && '📚'}
                    {selectedTopic.type === 'PRACTICE' && '⚙️'}
                    {selectedTopic.type === 'PROJECT' && '🚀'}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-lg">{getLocalizedText(selectedTopic.name, language)}</h4>
                    {session && (
                      <div className="mt-2">
                        {selectedTopic.status !== 'LEARNED_AND_VALIDATED' ? (
                          <select
                            value={selectedTopic.status || 'NOT_LEARNED'}
                            onChange={(e) => updateTopicStatus(selectedTopic.id, e.target.value)}
                            disabled={updating === selectedTopic.id}
                            className={`px-3 py-1 border-2 rounded-full text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white ${
                              updating === selectedTopic.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                            } ${
                              selectedTopic.status === 'NOT_LEARNED' ? 'border-gray-500 text-gray-700' :
                              selectedTopic.status === 'WANT_TO_LEARN' ? 'border-blue-500 text-blue-700' :
                              selectedTopic.status === 'LEARNING' ? 'border-yellow-500 text-yellow-700' :
                              selectedTopic.status === 'LEARNED' ? 'border-green-500 text-green-700' :
                              'border-gray-500 text-gray-700'
                            }`}
                          >
                            {allowedStatuses.map((status) => (
                              <option key={status} value={status}>
                                {updating === selectedTopic.id && selectedTopic.status === status ? 'Updating...' : statusLabels[status as keyof typeof statusLabels]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border-2 border-purple-500 text-purple-700 bg-purple-50">
                            🎓 {statusLabels[selectedTopic.status as keyof typeof statusLabels]}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Description */}
                {selectedTopic.description && (
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-2">Description</h5>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {getLocalizedText(selectedTopic.description, language)}
                    </p>
                  </div>
                )}

                {/* Key Points */}
                {selectedTopic.keypoints && (() => {
                  const keypoints = getLocalizedText(selectedTopic.keypoints, language)
                  try {
                    const parsed = JSON.parse(keypoints)
                    const keypointsList = Array.isArray(parsed) ? parsed : [parsed]
                    
                    return (
                      <div>
                        <h5 className="font-semibold text-gray-900 mb-3">What you'll learn</h5>
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4">
                          <div className="space-y-2">
                            {keypointsList.filter(point => point && point.trim()).map((point, index) => (
                              <div key={index} className="flex items-start space-x-2">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                                <p className="text-sm text-gray-700 leading-relaxed">{point.trim()}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  } catch (error) {
                    // Fallback for non-JSON keypoints
                    return (
                      <div>
                        <h5 className="font-semibold text-gray-900 mb-3">What you'll learn</h5>
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4">
                          <div className="space-y-2">
                            {keypoints.split('\n').filter(point => point.trim()).map((point, index) => (
                              <div key={index} className="flex items-start space-x-2">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                                <p className="text-sm text-gray-700 leading-relaxed">{point.trim()}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  }
                })()}

                {/* Prerequisites */}
                <div>
                  <h5 className="font-semibold text-gray-900 mb-3">Prerequisites ({prerequisites.length})</h5>
                  {loadingRelations ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                  ) : prerequisites.length > 0 ? (
                    <div className="space-y-2">
                      {prerequisites.map(prereq => (
                        <div 
                          key={prereq.prerequisite.id}
                          onClick={() => {
                            // Pass original referrer to maintain consistent back navigation
                            const referrerParam = originalReferrer ? `?from=${encodeURIComponent(originalReferrer)}` : ''
                            router.push(`/knowledge-graph/local/${prereq.prerequisite.slug}${referrerParam}`)
                          }}
                          className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs ${
                            prereq.prerequisite.type === 'THEORY' ? 'bg-blue-500' :
                            prereq.prerequisite.type === 'PRACTICE' ? 'bg-green-500' : 'bg-purple-500'
                          }`}>
                            {prereq.prerequisite.type === 'THEORY' && '📚'}
                            {prereq.prerequisite.type === 'PRACTICE' && '⚙️'}
                            {prereq.prerequisite.type === 'PROJECT' && '🚀'}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 text-sm hover:text-indigo-600 transition-colors">{getLocalizedText(prereq.prerequisite.name, language)}</div>
                            <div className="text-xs text-gray-500 capitalize">{prereq.prerequisite.type?.toLowerCase() || 'unknown'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No prerequisites required</p>
                  )}
                </div>

                {/* Effects/Unlocks */}
                <div>
                  <h5 className="font-semibold text-gray-900 mb-3">Unlocks ({effects.length})</h5>
                  {loadingRelations ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                  ) : effects.length > 0 ? (
                    <div className="space-y-2">
                      {effects.map(effect => (
                        <div 
                          key={effect.id}
                          onClick={() => {
                            // Pass original referrer to maintain consistent back navigation
                            const referrerParam = originalReferrer ? `?from=${encodeURIComponent(originalReferrer)}` : ''
                            router.push(`/knowledge-graph/local/${effect.slug}${referrerParam}`)
                          }}
                          className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs ${
                            effect.type === 'THEORY' ? 'bg-blue-500' :
                            effect.type === 'PRACTICE' ? 'bg-green-500' : 'bg-purple-500'
                          }`}>
                            {effect.type === 'THEORY' && '📚'}
                            {effect.type === 'PRACTICE' && '⚙️'}
                            {effect.type === 'PROJECT' && '🚀'}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 text-sm hover:text-indigo-600 transition-colors">{getLocalizedText(effect.name, language)}</div>
                            <div className="text-xs text-gray-500 capitalize">{effect.type?.toLowerCase() || 'unknown'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">This topic doesn't unlock any others yet</p>
                  )}
                </div>

                {/* Courses */}
                <div>
                  <h5 className="font-semibold text-gray-900 mb-3">Courses ({courses.length})</h5>
                  {loadingRelations ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                  ) : courses.length > 0 ? (
                    <div className="space-y-3">
                      {courses.map((course) => (
                        <div 
                          key={course.id}
                          className="flex flex-col space-y-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg hover:from-blue-100 hover:to-indigo-100 transition-colors cursor-pointer border border-blue-200"
                          onClick={() => router.push(`/courses/${course.id}`)}
                        >
                          <div className="flex items-start justify-between">
                            <h6 className="font-medium text-gray-900 text-sm leading-tight">{getLocalizedText(course.name, language)}</h6>
                            <span className="text-xs text-blue-600 font-medium bg-blue-100 px-2 py-1 rounded-full ml-2 flex-shrink-0">
                              {course._count?.topics || 0} topics
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-gray-600">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>{course.educator?.name || 'Unknown educator'}</span>
                            <span>•</span>
                            <span>{course._count?.enrollments || 0} students</span>
                          </div>
                          {course.description && (
                            <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                              {getLocalizedText(course.description, language)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No courses available for this topic yet</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Help text when no topic selected */}
        {!selectedTopic && (
          <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 text-center border border-indigo-100">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Local Knowledge Graph</h3>
            <p className="text-gray-600 mb-4">
              This view shows topics related to <strong>{getLocalizedText(centerTopic.name, language)}</strong>.
            </p>
            <div className="text-sm text-gray-500 space-y-1">
              <div>• Click expansion badges (↑/↓) to explore prerequisites and effects</div>
              <div>• Double-click any topic to recenter the graph on it</div>
              <div>• Click topics to see detailed information</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}