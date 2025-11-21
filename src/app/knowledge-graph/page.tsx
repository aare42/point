'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import KnowledgeGraph from '@/components/KnowledgeGraph'
import { useLanguage } from '@/contexts/LanguageContext'
import { TopicType } from '@prisma/client'
import { getLocalizedText } from '@/lib/utils/multilingual'

interface Topic {
  id: string
  name: any // Multilingual object
  slug: string
  type: TopicType
  description?: any // Multilingual object
  keypoints: any // Multilingual object
  status: string // Student's learning status
  prerequisites: {
    prerequisite: {
      id: string
      name: any // Multilingual object
      slug: string
      type: TopicType
    }
  }[]
}

interface GraphNode {
  id: string
  name: string
  slug: string
  type: TopicType
  description?: string
  keypoints?: string
  status?: string
}

interface GraphLink {
  source: string
  target: string
  value: number
}

function KnowledgeGraphContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const { t, language } = useLanguage()
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNodeId, setSelectedNodeId] = useState<string>('')
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [filterType, setFilterType] = useState<TopicType | 'ALL'>('ALL')
  const [updating, setUpdating] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [courses, setCourses] = useState<any[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [creationMode, setCreationMode] = useState<'course' | 'goal' | 'vacancy' | null>(null)
  const [selectedTopicsForCreation, setSelectedTopicsForCreation] = useState<string[]>([])

  const statusLabels = {
    NOT_LEARNED: t('status.not_learned'),
    WANT_TO_LEARN: t('status.want_to_learn'),
    LEARNING: t('status.learning'),
    LEARNED: t('status.learned'),
    LEARNED_AND_VALIDATED: t('status.validated')
  }

  const statusColors = {
    NOT_LEARNED: 'bg-gray-100 text-gray-800 border-gray-300',
    WANT_TO_LEARN: 'bg-blue-100 text-blue-800 border-blue-300',
    LEARNING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    LEARNED: 'bg-green-100 text-green-800 border-green-300',
    LEARNED_AND_VALIDATED: 'bg-purple-100 text-purple-800 border-purple-300'
  }

  const allowedStatuses = ['NOT_LEARNED', 'WANT_TO_LEARN', 'LEARNING', 'LEARNED']

  // Smart back navigation function
  const handleBackNavigation = () => {
    const referrer = searchParams.get('from')
    
    if (referrer) {
      // Navigate back to the specific page they came from
      router.push(referrer)
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

  // Get appropriate back button text based on referrer
  const getBackButtonText = () => {
    const referrer = searchParams.get('from')
    
    if (referrer) {
      if (referrer.includes('/knowledge-graph/local/')) return 'Back to Local View'
      if (referrer.includes('/student')) return 'Back to Dashboard'
    }
    
    return session ? 'Back to Dashboard' : 'Back'
  }

  useEffect(() => {
    setMounted(true)
    fetchTopics()
  }, [language, session])

  // Handle center parameter from URL
  useEffect(() => {
    const centerTopicId = searchParams.get('center')
    if (centerTopicId && topics.length > 0) {
      const centerTopic = topics.find(topic => topic.id === centerTopicId)
      if (centerTopic) {
        // Convert topic to GraphNode format
        const graphNode: GraphNode = {
          id: centerTopic.id,
          name: getLocalizedText(centerTopic.name, language),
          slug: centerTopic.slug,
          type: centerTopic.type,
          description: centerTopic.description ? getLocalizedText(centerTopic.description, language) : undefined,
          keypoints: centerTopic.keypoints ? getLocalizedText(centerTopic.keypoints, language) : undefined,
          status: centerTopic.status || 'NOT_LEARNED'
        }
        
        setSelectedNodeId(centerTopic.id)
        setSelectedNode(graphNode)
        
        // Also fetch courses for this topic
        fetchCoursesForTopic(centerTopic.id)
      }
    }
  }, [topics, searchParams, language])

  const fetchTopics = async () => {
    try {
      // Use public API for unauthenticated users, student API for authenticated users
      const apiEndpoint = session 
        ? `/api/student/topics?lang=${language}` 
        : `/api/topics/public?lang=${language}`
      
      const response = await fetch(apiEndpoint)
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

  const updateTopicStatus = async (topicId: string, newStatus: string) => {
    setUpdating(topicId)
    try {
      const response = await fetch('/api/student/topics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topicId, status: newStatus }),
      })

      if (response.ok) {
        setTopics(topics.map(topic => 
          topic.id === topicId ? { ...topic, status: newStatus } : topic
        ))
        
        // Update selected node if it's the one being updated
        if (selectedNode?.id === topicId) {
          setSelectedNode({ ...selectedNode, status: newStatus })
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

  const prepareGraphData = () => {
    // Always include all topics to maintain graph structure
    const nodes: GraphNode[] = topics.map(topic => {
      const topicName = getLocalizedText(topic.name, language)
      const matchesSearch = searchQuery === '' || 
        topicName.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = filterType === 'ALL' || topic.type === filterType
      
      return {
        id: topic.id,
        name: topicName,
        slug: topic.slug,
        type: topic.type,
        description: getLocalizedText(topic.description, language),
        keypoints: getLocalizedText(topic.keypoints, language),
        status: topic.status,
        highlighted: matchesSearch && matchesType,
        selected: creationMode ? selectedTopicsForCreation.includes(topic.id) : false
      }
    })

    const links: GraphLink[] = []
    topics.forEach(topic => {
      topic.prerequisites.forEach(prereq => {
        links.push({
          source: prereq.prerequisite.id,
          target: topic.id,
          value: 1
        })
      })
    })

    return { nodes, links, highlightType: filterType }
  }

  const handleNodeClick = (node: GraphNode) => {
    if (creationMode) {
      // In creation mode, toggle topic selection
      setSelectedTopicsForCreation(prev => 
        prev.includes(node.id)
          ? prev.filter(id => id !== node.id)
          : [...prev, node.id]
      )
    } else {
      // Normal mode
      setSelectedNodeId(node.id)
    }
  }

  // Switch to local view centered on selected topic
  const switchToLocalView = (topicSlug?: string) => {
    const slug = topicSlug || selectedNode?.slug
    if (slug) {
      router.push(`/knowledge-graph/local/${slug}`)
    } else {
      alert('Please select a topic first to center the local view')
    }
  }

  // Handle double-click on node to switch to local view
  const handleNodeDoubleClick = (node: GraphNode) => {
    console.log('Double-click on global graph node:', node.name, 'navigating to local view')
    router.push(`/knowledge-graph/local/${node.slug}?from=${encodeURIComponent(window.location.pathname + window.location.search)}`)
  }
  
  const handleNodeSelect = (node: GraphNode | null) => {
    setSelectedNode(node)
    setSelectedNodeId(node?.id || '')
    
    // Fetch courses that include this topic
    if (node?.id) {
      fetchCoursesForTopic(node.id)
    } else {
      setCourses([])
    }
  }

  const fetchCoursesForTopic = async (topicId: string) => {
    setLoadingCourses(true)
    try {
      const response = await fetch(`/api/courses?lang=${language}`)
      if (response.ok) {
        const allCourses = await response.json()
        // Filter courses that include this topic
        const relevantCourses = allCourses.filter((course: any) => 
          course.topics.some((ct: any) => ct.topic.id === topicId)
        )
        setCourses(relevantCourses)
      }
    } catch (error) {
      console.error('Error fetching courses for topic:', error)
      setCourses([])
    } finally {
      setLoadingCourses(false)
    }
  }

  // Creation mode functions
  const startCreationMode = (mode: 'course' | 'goal' | 'vacancy') => {
    setCreationMode(mode)
    setSelectedTopicsForCreation([])
    setSelectedNode(null) // Clear selected node when entering creation mode
    setSelectedNodeId('')
  }

  const cancelCreationMode = () => {
    setCreationMode(null)
    setSelectedTopicsForCreation([])
  }

  const proceedToCreation = () => {
    if (!creationMode || selectedTopicsForCreation.length === 0) {
      alert('Please select at least one topic to continue')
      return
    }

    const topicIds = selectedTopicsForCreation.join(',')
    
    switch (creationMode) {
      case 'course':
        router.push(`/educator/courses/new?topicIds=${topicIds}`)
        break
      case 'goal':
        router.push(`/student/goals/new?topicIds=${topicIds}`)
        break
      case 'vacancy':
        router.push(`/employer/vacancies/create?topicIds=${topicIds}`)
        break
    }
  }

  // Get user's current role for showing appropriate creation buttons
  const getCurrentRole = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedRole') || 'STUDENT'
    }
    return 'STUDENT'
  }


  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading knowledge graph...</p>
          </div>
        </div>
      </div>
    )
  }

  const graphData = prepareGraphData()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                🧠 {t('graph.title')}
                {creationMode && (
                  <span className="text-lg ml-4 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full">
                    {creationMode === 'course' && '📚 Course Creation Mode'}
                    {creationMode === 'goal' && '🎯 Goal Creation Mode'}
                    {creationMode === 'vacancy' && '💼 Vacancy Creation Mode'}
                  </span>
                )}
              </h1>
              <p className="text-gray-600">
                {creationMode 
                  ? `Click on topics to select them for your new ${creationMode}. Selected: ${selectedTopicsForCreation.length} topics`
                  : t('graph.subtitle')
                }
              </p>
            </div>
            
            {/* Controls */}
            <div className="flex items-center space-x-4">
              {/* Creation Mode Controls */}
              {creationMode ? (
                <>
                  <button
                    onClick={cancelCreationMode}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={proceedToCreation}
                    disabled={selectedTopicsForCreation.length === 0}
                    className="flex items-center space-x-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    <span>Continue ({selectedTopicsForCreation.length} selected)</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              ) : (
                <>
                  {/* Role-based Creation Buttons */}
                  {session && (
                    <div className="flex items-center space-x-2">
                      {getCurrentRole() === 'EDUCATOR' && (
                        <button
                          onClick={() => startCreationMode('course')}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          <span>📚</span>
                          <span>Create Course</span>
                        </button>
                      )}
                      {getCurrentRole() === 'STUDENT' && (
                        <button
                          onClick={() => startCreationMode('goal')}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                          <span>🎯</span>
                          <span>Create Goal</span>
                        </button>
                      )}
                      {getCurrentRole() === 'EMPLOYER' && (
                        <button
                          onClick={() => startCreationMode('vacancy')}
                          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                        >
                          <span>💼</span>
                          <span>Post Job</span>
                        </button>
                      )}
                    </div>
                  )}
                  
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
                </>
              )}
              
              {/* Search and Filter - Hide in creation mode */}
              {!creationMode && (
                <>
                  {/* Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t('graph.search_topics')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="px-4 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white w-64"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  {/* Type Filter */}
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as TopicType | 'ALL')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                    <option value="ALL">{t('graph.highlight_all')}</option>
                    <option value="THEORY">📚 {t('graph.highlight_theory')}</option>
                    <option value="PRACTICE">⚙️ {t('graph.highlight_practice')}</option>
                    <option value="PROJECT">🚀 {t('graph.highlight_projects')}</option>
                  </select>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-indigo-600">{graphData.nodes.length}</div>
            <div className="text-sm text-gray-600">{t('graph.total_topics')}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-green-600">
              {graphData.nodes.filter(n => 
                (searchQuery === '' || n.name.toLowerCase().includes(searchQuery.toLowerCase())) &&
                (filterType === 'ALL' || n.type === filterType)
              ).length}
            </div>
            <div className="text-sm text-gray-600">
              {searchQuery || filterType !== 'ALL' ? t('graph.highlighted_topics') : t('graph.total_topics')}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-purple-600">
              {graphData.nodes.filter(n => n.type === 'PROJECT').length}
            </div>
            <div className="text-sm text-gray-600">{t('graph.projects')}</div>
          </div>
        </div>
        
        {/* Search Results Info */}
        {searchQuery && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-blue-800">
                Found <strong>{graphData.nodes.filter(n => 
                  (searchQuery === '' || n.name.toLowerCase().includes(searchQuery.toLowerCase())) &&
                  (filterType === 'ALL' || n.type === filterType)
                ).length}</strong> topic{graphData.nodes.filter(n => 
                  (searchQuery === '' || n.name.toLowerCase().includes(searchQuery.toLowerCase())) &&
                  (filterType === 'ALL' || n.type === filterType)
                ).length !== 1 ? 's' : ''} matching "{searchQuery}"
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-blue-600 hover:text-blue-800 underline text-sm ml-2"
              >
                Clear search
              </button>
            </div>
          </div>
        )}

        {/* Graph */}
        {graphData.nodes.length > 0 ? (
          <div className="flex gap-6">
            {/* Main Graph */}
            <div className="flex-1 bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
              <div className="mb-4 flex items-center justify-end">
                <div className="text-sm text-gray-500">
                  {t('graph.zoom_instructions')}
                </div>
              </div>
              
              <div className="flex justify-center">
                <KnowledgeGraph
                  data={graphData}
                  width={selectedNode && !creationMode ? 800 : 1100}
                  height={700}
                  onNodeClick={handleNodeClick}
                  onNodeDoubleClick={handleNodeDoubleClick}
                  onNodeSelect={handleNodeSelect}
                  selectedNodeId={selectedNodeId}
                  centerOnNodeId={searchParams.get('center') || undefined}
                />
              </div>
            </div>
            
            {/* Right Panel - Topic Details (hidden in creation mode) */}
            {selectedNode && !creationMode && (
              <div className="w-80 bg-white rounded-2xl shadow-xl border border-gray-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-end mb-4">
                    <button
                      onClick={() => handleNodeSelect(null)}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold bg-gray-600">
                      {selectedNode.type === 'THEORY' && '📚'}
                      {selectedNode.type === 'PRACTICE' && '⚙️'}
                      {selectedNode.type === 'PROJECT' && '🚀'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-lg">{selectedNode.name}</h4>
                      {session && (
                        <div className="mt-2">
                          {selectedNode.status !== 'LEARNED_AND_VALIDATED' ? (
                            <select
                              value={selectedNode.status || 'NOT_LEARNED'}
                              onChange={(e) => updateTopicStatus(selectedNode.id, e.target.value)}
                              disabled={updating === selectedNode.id}
                              className={`px-3 py-1 border-2 rounded-full text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white ${
                                updating === selectedNode.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                              } ${
                                selectedNode.status === 'NOT_LEARNED' ? 'border-gray-500 text-gray-700' :
                                selectedNode.status === 'WANT_TO_LEARN' ? 'border-blue-500 text-blue-700' :
                                selectedNode.status === 'LEARNING' ? 'border-yellow-500 text-yellow-700' :
                                selectedNode.status === 'LEARNED' ? 'border-green-500 text-green-700' :
                                'border-gray-500 text-gray-700'
                              }`}
                            >
                              {allowedStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {updating === selectedNode.id && selectedNode.status === status ? 'Updating...' : statusLabels[status as keyof typeof statusLabels]}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border-2 border-purple-500 text-purple-700 bg-purple-50">
                              🎓 {statusLabels[selectedNode.status as keyof typeof statusLabels]}
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
                  {selectedNode.description && (
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-2">Description</h5>
                      <p className="text-gray-700 text-sm leading-relaxed">{selectedNode.description}</p>
                    </div>
                  )}

                  
                  {/* Key Points */}
                  {selectedNode.keypoints && (() => {
                    try {
                      const keypoints = JSON.parse(selectedNode.keypoints)
                      const keypointsList = Array.isArray(keypoints) ? keypoints : [keypoints]
                      
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
                              {selectedNode.keypoints.split('\n').filter(point => point.trim()).map((point, index) => (
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
                  {(() => {
                    const topicData = topics.find(t => t.id === selectedNode.id)
                    if (!topicData) return null
                    
                    return (
                      <div>
                        <h5 className="font-semibold text-gray-900 mb-3">Prerequisites ({topicData.prerequisites.length})</h5>
                        {topicData.prerequisites.length > 0 ? (
                          <div className="space-y-2">
                            {topicData.prerequisites.map(prereq => (
                              <div 
                                key={prereq.prerequisite.id}
                                onClick={() => router.push(`/knowledge-graph/local/${prereq.prerequisite.slug}?from=/knowledge-graph`)}
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
                    )
                  })()}
                  
                  {/* Dependents */}
                  {(() => {
                    const dependents = topics.filter(t => 
                      t.prerequisites.some(p => p.prerequisite.id === selectedNode.id)
                    )
                    
                    return (
                      <div>
                        <h5 className="font-semibold text-gray-900 mb-3">Unlocks ({dependents.length})</h5>
                        {dependents.length > 0 ? (
                          <div className="space-y-2">
                            {dependents.map(dependent => (
                              <div 
                                key={dependent.id}
                                onClick={() => router.push(`/knowledge-graph/local/${dependent.slug}?from=/knowledge-graph`)}
                                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                              >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs ${
                                  dependent.type === 'THEORY' ? 'bg-blue-500' :
                                  dependent.type === 'PRACTICE' ? 'bg-green-500' : 'bg-purple-500'
                                }`}>
                                  {dependent.type === 'THEORY' && '📚'}
                                  {dependent.type === 'PRACTICE' && '⚙️'}
                                  {dependent.type === 'PROJECT' && '🚀'}
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 text-sm hover:text-indigo-600 transition-colors">{getLocalizedText(dependent.name, language)}</div>
                                  <div className="text-xs text-gray-500 capitalize">{dependent.type?.toLowerCase() || 'unknown'}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">This topic doesn't unlock any others yet</p>
                        )}
                      </div>
                    )
                  })()}
                  
                  {/* Courses */}
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-3">Courses ({courses.length})</h5>
                    {loadingCourses ? (
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
                                {course.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-gray-50 rounded-lg">
                        <div className="text-2xl mb-2">📚</div>
                        <p className="text-sm text-gray-500 mb-2">No courses found for this topic</p>
                        <p className="text-xs text-gray-400">Check out all available courses to see what's offered</p>
                        <button
                          onClick={() => router.push('/courses')}
                          className="mt-3 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Browse all courses →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center border border-gray-200">
            <div className="text-6xl mb-6">📚</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">No Topics Found</h3>
            <p className="text-gray-600 mb-6">
              {filterType === 'ALL' 
                ? "There are no topics in your knowledge base yet."
                : `No ${filterType?.toLowerCase() || 'unknown'} topics found.`
              }
            </p>
            <button
              onClick={() => router.push('/admin/topics/new')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Create Your First Topic
            </button>
          </div>
        )}

        {/* Help text when no topic selected */}
        {!selectedNode && graphData.nodes.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 text-center border border-indigo-100">
            <div className="text-4xl mb-4">🧠</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Interactive Knowledge Graph</h3>
            <p className="text-gray-600 mb-4">
              Click on any topic to see detailed information, prerequisites, and what it unlocks.
            </p>
            <div className="text-sm text-gray-500 mb-4">
              Topics are organized in levels - prerequisites appear higher than their dependents.
            </div>
            {!session && (
              <div className="mt-6 p-4 bg-white/50 rounded-lg border border-indigo-200">
                <p className="text-sm text-gray-700 mb-3">
                  🎓 <strong>Sign in to track your learning progress!</strong> Set topic statuses, create goals, and build your knowledge portfolio.
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  Sign In to Get Started
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-20">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading knowledge graph...</p>
        </div>
      </div>
    </div>
  )
}

export default function KnowledgeGraphPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <KnowledgeGraphContent />
    </Suspense>
  )
}