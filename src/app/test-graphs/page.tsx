'use client'

import { useState, useEffect } from 'react'
import KnowledgeGraphApproach1 from '@/components/KnowledgeGraphApproach1'
import KnowledgeGraphApproach2 from '@/components/KnowledgeGraphApproach2'
import KnowledgeGraphApproach3 from '@/components/KnowledgeGraphApproach3'
import KnowledgeGraphApproach4 from '@/components/KnowledgeGraphApproach4'
import KnowledgeGraphApproach5 from '@/components/KnowledgeGraphApproach5'
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

export default function TestGraphsPage() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNodeId, setSelectedNodeId] = useState<string>('')
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)

  useEffect(() => {
    fetchTopics()
  }, [])

  const fetchTopics = async () => {
    try {
      // Try to load production data first for testing
      const urlParams = new URLSearchParams(window.location.search)
      const useProdData = urlParams.get('prod') === 'true'
      
      if (useProdData) {
        console.log('🔧 Loading production data for testing...')
        try {
          const response = await fetch('/production-data.json')
          if (response.ok) {
            const prodData = await response.json()
            if (prodData.topics) {
              console.log('✅ Loaded production data:', prodData.topics.length, 'topics')
              setTopics(prodData.topics)
              setLoading(false)
              return
            }
          }
        } catch (e) {
          console.log('❌ Failed to load production data, falling back to API')
        }
      }
      
      // Fall back to regular API
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

    console.log('📊 Graph data prepared:', nodes.length, 'nodes,', links.length, 'links')
    return { nodes, links }
  }

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNodeId(node.id)
  }
  
  const handleNodeSelect = (node: GraphNode | null) => {
    setSelectedNode(node)
    setSelectedNodeId(node?.id || '')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading test graphs...</p>
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
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
            🧪 Knowledge Graph Approaches Comparison
          </h1>
          <p className="text-gray-600 mb-2">
            Compare 5 different layout approaches for the knowledge graph visualization
          </p>
          <p className="text-sm text-gray-500">
            Topics: {graphData.nodes.length} • Links: {graphData.links.length}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-2xl font-bold text-blue-600">{graphData.nodes.filter(n => n.type === 'THEORY').length}</div>
            <div className="text-sm text-gray-600">📚 Theory Topics</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-2xl font-bold text-green-600">{graphData.nodes.filter(n => n.type === 'PRACTICE').length}</div>
            <div className="text-sm text-gray-600">⚙️ Practice Topics</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-2xl font-bold text-purple-600">{graphData.nodes.filter(n => n.type === 'PROJECT').length}</div>
            <div className="text-sm text-gray-600">🚀 Project Topics</div>
          </div>
        </div>

        {/* Graphs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {/* Approach 1: Simple Force Layout */}
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
              1. Simple Force Layout
            </h3>
            <p className="text-sm text-gray-600 mb-4 text-center">
              Classic D3.js force-directed graph
            </p>
            <KnowledgeGraphApproach1
              data={graphData}
              width={400}
              height={350}
              onNodeClick={handleNodeClick}
              onNodeSelect={handleNodeSelect}
              selectedNodeId={selectedNodeId}
            />
          </div>

          {/* Approach 2: Hierarchical Layout */}
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
              2. Hierarchical Layout
            </h3>
            <p className="text-sm text-gray-600 mb-4 text-center">
              Top-down levels by prerequisite depth
            </p>
            <KnowledgeGraphApproach2
              data={graphData}
              width={400}
              height={350}
              onNodeClick={handleNodeClick}
              onNodeSelect={handleNodeSelect}
              selectedNodeId={selectedNodeId}
            />
          </div>

          {/* Approach 3: Circular Layout */}
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
              3. Circular Layout
            </h3>
            <p className="text-sm text-gray-600 mb-4 text-center">
              Concentric circles by topic type
            </p>
            <KnowledgeGraphApproach3
              data={graphData}
              width={400}
              height={350}
              onNodeClick={handleNodeClick}
              onNodeSelect={handleNodeSelect}
              selectedNodeId={selectedNodeId}
            />
          </div>

          {/* Approach 4: Grid Layout */}
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
              4. Grid Layout
            </h3>
            <p className="text-sm text-gray-600 mb-4 text-center">
              Grid sections by topic type
            </p>
            <KnowledgeGraphApproach4
              data={graphData}
              width={400}
              height={350}
              onNodeClick={handleNodeClick}
              onNodeSelect={handleNodeSelect}
              selectedNodeId={selectedNodeId}
            />
          </div>

          {/* Approach 5: Dagre Layout */}
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
              5. Dagre-style Layout
            </h3>
            <p className="text-sm text-gray-600 mb-4 text-center">
              Topological sort with layers
            </p>
            <KnowledgeGraphApproach5
              data={graphData}
              width={400}
              height={350}
              onNodeClick={handleNodeClick}
              onNodeSelect={handleNodeSelect}
              selectedNodeId={selectedNodeId}
            />
          </div>

          {/* Selected Node Details */}
          {selectedNode && (
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200 lg:col-span-2 xl:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Selected Topic</h3>
                <button
                  onClick={() => handleNodeSelect(null)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold bg-gray-600">
                    {selectedNode.type === 'THEORY' && '📚'}
                    {selectedNode.type === 'PRACTICE' && '⚙️'}
                    {selectedNode.type === 'PROJECT' && '🚀'}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900">{selectedNode.name}</h4>
                    <div className="text-sm text-gray-500 capitalize">{selectedNode.type?.toLowerCase()}</div>
                  </div>
                </div>
                
                {selectedNode.description && (
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-2">Description</h5>
                    <p className="text-gray-700 text-sm leading-relaxed">{selectedNode.description}</p>
                  </div>
                )}
                
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Click on different graphs to see how the same topic is positioned in each approach.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 text-center border border-indigo-100">
          <div className="text-2xl mb-4">📝</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">How to Compare</h3>
          <div className="text-gray-600 text-sm space-y-2">
            <p>• Click on any topic to see it highlighted across all approaches</p>
            <p>• Look for missing or overlapping arrows between connected topics</p>
            <p>• Consider readability and visual clarity of prerequisite relationships</p>
            <p>• Check if all {graphData.links.length} links are visible in each approach</p>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            Add ?prod=true to URL to test with production data
          </div>
        </div>
      </div>
    </div>
  )
}