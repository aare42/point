'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import KnowledgeGraphApproach4 from '@/components/KnowledgeGraphApproach4'
import { TopicType } from '@prisma/client'

interface Topic {
  id: string
  name: string
  slug: string
  type: TopicType
  description?: string
  keypoints: string
  status: string
  prerequisites: {
    prerequisite: {
      id: string
      name: string
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
  highlighted?: boolean
}

interface GraphLink {
  source: string
  target: string
  value: number
}

export default function Graph4Page() {
  const router = useRouter()
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNodeId, setSelectedNodeId] = useState<string>('')
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)

  useEffect(() => {
    fetchTopics()
  }, [])

  const fetchTopics = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const useProdData = urlParams.get('prod') === 'true'
      
      if (useProdData) {
        try {
          const response = await fetch('/production-data.json')
          if (response.ok) {
            const prodData = await response.json()
            if (prodData.topics) {
              setTopics(prodData.topics)
              setLoading(false)
              return
            }
          }
        } catch (e) {
          console.log('Failed to load production data')
        }
      }
      
      const response = await fetch('/api/student/topics')
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

  const prepareGraphData = () => {
    const nodes: GraphNode[] = topics.map(topic => ({
      id: topic.id,
      name: topic.name,
      slug: topic.slug,
      type: topic.type,
      description: topic.description,
      keypoints: topic.keypoints,
      status: topic.status,
      highlighted: true
    }))

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

    return { nodes, links }
  }

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNodeId(node.id)
  }
  
  const handleNodeSelect = (node: GraphNode | null) => {
    setSelectedNode(node)
    setSelectedNodeId(node?.id || '')
    
    if (node?.id) {
      fetchCoursesForTopic(node.id)
    } else {
      setCourses([])
    }
  }

  const fetchCoursesForTopic = async (topicId: string) => {
    setLoadingCourses(true)
    try {
      const response = await fetch('/api/courses')
      if (response.ok) {
        const allCourses = await response.json()
        const relevantCourses = allCourses.filter((course: any) => 
          course.topics.some((ct: any) => ct.topic.id === topicId)
        )
        setCourses(relevantCourses)
      }
    } catch (error) {
      setCourses([])
    } finally {
      setLoadingCourses(false)
    }
  }

  if (loading) {
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
                🧠 Approach 4: Grid Layout
              </h1>
              <p className="text-gray-600">
                Organized grid sections - Theory (top), Practice (middle), Projects (bottom)
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/test-graphs')}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Comparison</span>
              </button>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => router.push('/graph3')}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                >
                  ← Approach 3
                </button>
                <button
                  onClick={() => router.push('/graph5')}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                >
                  → Approach 5
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-indigo-600">{graphData.nodes.length}</div>
            <div className="text-sm text-gray-600">Total Topics</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-green-600">{graphData.links.length}</div>
            <div className="text-sm text-gray-600">Prerequisites</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-blue-600">{graphData.nodes.filter(n => n.type === 'THEORY').length}</div>
            <div className="text-sm text-gray-600">📚 Theory (Top)</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-purple-600">{graphData.nodes.filter(n => n.type === 'PRACTICE').length + graphData.nodes.filter(n => n.type === 'PROJECT').length}</div>
            <div className="text-sm text-gray-600">⚙️🚀 Practice+Projects</div>
          </div>
        </div>

        {/* Graph */}
        {graphData.nodes.length > 0 ? (
          <div className="flex gap-6">
            {/* Main Graph */}
            <div className="flex-1 bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Grid layout with type sections • Fixed positions • All {graphData.links.length} arrows should be visible
                </div>
                <div className="text-xs text-gray-400">
                  Approach 4 of 5
                </div>
              </div>
              
              <KnowledgeGraphApproach4
                data={graphData}
                width={selectedNode ? 900 : 1200}
                height={700}
                onNodeClick={handleNodeClick}
                onNodeSelect={handleNodeSelect}
                selectedNodeId={selectedNodeId}
              />
            </div>
            
            {/* Right Panel */}
            {selectedNode && (
              <div className="w-80 bg-white rounded-2xl shadow-xl border border-gray-200">
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
                      <div className="text-sm text-gray-500 capitalize">
                        {selectedNode.type?.toLowerCase()} • {
                          selectedNode.type === 'THEORY' ? 'Top Section' :
                          selectedNode.type === 'PRACTICE' ? 'Middle Section' : 'Bottom Section'
                        }
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  {selectedNode.description && (
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-2">Description</h5>
                      <p className="text-gray-700 text-sm leading-relaxed">{selectedNode.description}</p>
                    </div>
                  )}

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
                                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                                onClick={() => {
                                  const prereqNode = graphData.nodes.find(n => n.id === prereq.prerequisite.id)
                                  if (prereqNode) handleNodeSelect(prereqNode)
                                }}
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
                                  <div className="font-medium text-gray-900 text-sm">{prereq.prerequisite.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {prereq.prerequisite.type === 'THEORY' ? 'Top Section' :
                                     prereq.prerequisite.type === 'PRACTICE' ? 'Middle Section' : 'Bottom Section'}
                                  </div>
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
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center border border-gray-200">
            <div className="text-6xl mb-6">📚</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">No Topics Found</h3>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Test All Approaches</h3>
              <p className="text-sm text-gray-600">Compare different layout algorithms for the knowledge graph</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/graph1')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                1. Force
              </button>
              <button
                onClick={() => router.push('/graph2')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                2. Hierarchical
              </button>
              <button
                onClick={() => router.push('/graph3')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                3. Circular
              </button>
              <button
                onClick={() => router.push('/graph4')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium"
              >
                4. Grid
              </button>
              <button
                onClick={() => router.push('/graph5')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                5. Dagre
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}