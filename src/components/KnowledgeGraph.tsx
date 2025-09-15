'use client'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { TopicType } from '@prisma/client'

interface GraphNode {
  id: string
  name: string
  slug: string
  type: TopicType
  description?: string
  status?: string
  highlighted?: boolean
  fx?: number
  fy?: number
  x?: number
  y?: number
}

interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  value: number
}

interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

interface KnowledgeGraphProps {
  data: GraphData
  width?: number
  height?: number
  onNodeClick?: (node: GraphNode) => void
  selectedNodeId?: string
  onNodeSelect?: (node: GraphNode | null) => void
}

export default function KnowledgeGraph({ 
  data, 
  width = 800, 
  height = 600, 
  onNodeClick,
  selectedNodeId,
  onNodeSelect
}: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [isClientMounted, setIsClientMounted] = useState(false)
  const [isLegendOpen, setIsLegendOpen] = useState(false)

  useEffect(() => {
    setIsClientMounted(true)
  }, [])

  useEffect(() => {
    if (!isClientMounted || !svgRef.current || !data.nodes.length) return

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove()

    const svgElement = d3.select(svgRef.current)
    const graphContainer = svgElement.append('g')

    // Add zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        graphContainer.attr('transform', event.transform)
      })

    svgElement.call(zoomBehavior)

    // Advanced graph layout algorithm
    const improvedGraphLayout = () => {
      // 1. Calculate hierarchical levels for prerequisite chains
      const nodeLevels: Record<string, number> = {}
      
      const getNodeLevel = (nodeId: string, currentPath = new Set<string>()): number => {
        if (currentPath.has(nodeId)) return 0 // Circular dependency
        if (nodeLevels[nodeId] !== undefined) return nodeLevels[nodeId]
        
        currentPath.add(nodeId)
        
        const nodePrerequisites = data.links
          .filter(link => (typeof link.target === 'string' ? link.target : link.target.id) === nodeId)
          .map(link => typeof link.source === 'string' ? link.source : link.source.id)
        
        if (nodePrerequisites.length === 0) {
          nodeLevels[nodeId] = 0
        } else {
          const prerequisiteLevels = nodePrerequisites.map(prereqId => getNodeLevel(prereqId, new Set(currentPath)))
          nodeLevels[nodeId] = Math.max(...prerequisiteLevels) + 1
        }
        
        currentPath.delete(nodeId)
        return nodeLevels[nodeId]
      }
      
      data.nodes.forEach(node => getNodeLevel(node.id))
      
      // 2. Group nodes by type and level for clustering
      const typeGroups: Record<TopicType, GraphNode[]> = {
        THEORY: [],
        PRACTICE: [],
        PROJECT: []
      }
      
      data.nodes.forEach(node => {
        typeGroups[node.type].push(node)
      })
      
      // 3. Calculate cluster centers based on topic types
      const maxLevel = Math.max(...Object.values(nodeLevels))
      const centerX = width / 2
      const centerY = height / 2
      
      // Create three main cluster areas (triangular arrangement)
      const clusterCenters = {
        THEORY: { x: centerX - 200, y: centerY - 150 },    // Top left
        PRACTICE: { x: centerX + 200, y: centerY - 150 },  // Top right  
        PROJECT: { x: centerX, y: centerY + 200 }          // Bottom center
      }
      
      // 4. Position nodes within clusters based on hierarchy
      data.nodes.forEach(node => {
        const level = nodeLevels[node.id] || 0
        const cluster = clusterCenters[node.type]
        const nodesInType = typeGroups[node.type]
        const nodeIndex = nodesInType.indexOf(node)
        
        // Create concentric circles within each cluster based on level
        const levelRadius = 80 + (level * 60)
        const nodesInLevel = nodesInType.filter(n => (nodeLevels[n.id] || 0) === level)
        const angleStep = (2 * Math.PI) / Math.max(nodesInLevel.length, 1)
        const nodeAngle = angleStep * nodesInLevel.indexOf(node)
        
        // Add some randomness to avoid perfect circles (looks more organic)
        const radiusVariation = (Math.random() - 0.5) * 30
        const angleVariation = (Math.random() - 0.5) * 0.3
        
        // Calculate position in cluster
        const radius = levelRadius + radiusVariation
        const angle = nodeAngle + angleVariation
        
        node.fx = cluster.x + Math.cos(angle) * radius
        node.fy = cluster.y + Math.sin(angle) * radius
        
        // Ensure nodes stay within bounds
        node.fx = Math.max(50, Math.min(width - 50, node.fx))
        node.fy = Math.max(50, Math.min(height - 50, node.fy))
      })
      
      return { nodeLevels, maxLevel }
    }
    
    const { nodeLevels, maxLevel } = improvedGraphLayout()
    
    // Create enhanced force simulation with clustering
    const forceSimulation = d3.forceSimulation<GraphNode>(data.nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(data.links)
        .id(nodeData => nodeData.id)
        .distance(linkData => {
          // Variable distance based on node types and levels
          const sourceNode = typeof linkData.source === 'object' ? linkData.source : data.nodes.find(n => n.id === linkData.source)
          const targetNode = typeof linkData.target === 'object' ? linkData.target : data.nodes.find(n => n.id === linkData.target)
          
          if (!sourceNode || !targetNode) return 100
          
          // Shorter links within same type, longer links between types
          const sameType = sourceNode.type === targetNode.type
          const levelDiff = Math.abs((nodeLevels[sourceNode.id] || 0) - (nodeLevels[targetNode.id] || 0))
          
          return sameType ? 60 + (levelDiff * 20) : 120 + (levelDiff * 30)
        })
        .strength(0.3))
      .force('collision', d3.forceCollide().radius(70))
      .force('center', d3.forceCenter(width / 2, height / 2))
      // Add clustering forces to keep same types together
      .force('cluster', () => {
        const alpha = forceSimulation.alpha()
        data.nodes.forEach(node => {
          const clusterCenter = {
            THEORY: { x: width / 2 - 200, y: height / 2 - 150 },
            PRACTICE: { x: width / 2 + 200, y: height / 2 - 150 },
            PROJECT: { x: width / 2, y: height / 2 + 200 }
          }[node.type]
          
          if (!clusterCenter || !node.x || !node.y) return
          
          const dx = clusterCenter.x - node.x
          const dy = clusterCenter.y - node.y
          const strength = alpha * 0.1 // Gentle clustering force
          
          node.vx = (node.vx || 0) + dx * strength
          node.vy = (node.vy || 0) + dy * strength
        })
      })
      .alpha(0.3)
      .alphaDecay(0.02) // Slower cooling for better organization

    // Node colors based on selection, hover, and highlighting
    const getNodeColor = (nodeData: GraphNode, isSelected: boolean, isHovered: boolean) => {
      if (isSelected) return '#1F2937'  // Dark gray when selected
      if (isHovered) return '#374151'   // Medium gray when hovered
      
      // Use highlighting to make non-highlighted nodes more transparent
      if (nodeData.highlighted === false) {
        return '#9CA3AF'  // Lighter gray for non-highlighted nodes
      }
      
      return '#6B7280'  // Normal gray for highlighted or all nodes
    }
    
    // Get node opacity based on highlighting
    const getNodeOpacity = (nodeData: GraphNode) => {
      if (nodeData.highlighted === false) {
        return 0.4  // Semi-transparent for non-highlighted
      }
      return 1.0  // Full opacity for highlighted or all nodes
    }
    
    // Status-based border colors
    const getStatusBorderColor = (learningStatus: string | undefined) => {
      const statusBorderColors = {
        NOT_LEARNED: '#9CA3AF',         // Gray
        WANT_TO_LEARN: '#3B82F6',       // Blue
        LEARNING: '#F59E0B',            // Orange/Yellow
        LEARNED: '#10B981',             // Green
        LEARNED_AND_VALIDATED: '#8B5CF6' // Purple
      }
      return statusBorderColors[learningStatus as keyof typeof statusBorderColors] || statusBorderColors.NOT_LEARNED
    }

    // Enhanced edge bundling for better visualization
    const createBundledPath = (sourceNode: GraphNode, targetNode: GraphNode) => {
      if (!sourceNode.x || !sourceNode.y || !targetNode.x || !targetNode.y) return ''
      
      const dx = targetNode.x - sourceNode.x
      const dy = targetNode.y - sourceNode.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // Different curve styles based on relationship type
      const sameType = sourceNode.type === targetNode.type
      const isLongDistance = distance > 200
      
      if (sameType && !isLongDistance) {
        // Simple straight line for close same-type connections
        return `M ${sourceNode.x},${sourceNode.y} L ${targetNode.x},${targetNode.y}`
      } else {
        // Curved paths for cross-type or long-distance connections
        const midX = (sourceNode.x + targetNode.x) / 2
        const midY = (sourceNode.y + targetNode.y) / 2
        
        // Calculate control point for curve
        const curvature = sameType ? 0.3 : 0.5
        const perpX = -dy * curvature
        const perpY = dx * curvature
        
        const controlX = midX + perpX
        const controlY = midY + perpY
        
        return `M ${sourceNode.x},${sourceNode.y} Q ${controlX},${controlY} ${targetNode.x},${targetNode.y}`
      }
    }

    // Create enhanced links with bundling
    const linkElements = graphContainer.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(data.links)
      .enter().append('path')
      .attr('class', 'link')
      .style('stroke', linkData => {
        // Color code links by type relationship
        const sourceNode = typeof linkData.source === 'object' ? linkData.source : data.nodes.find(n => n.id === linkData.source)
        const targetNode = typeof linkData.target === 'object' ? linkData.target : data.nodes.find(n => n.id === linkData.target)
        
        if (!sourceNode || !targetNode) return '#94A3B8'
        
        const sameType = sourceNode.type === targetNode.type
        return sameType ? '#64748B' : '#A855F7' // Gray for same type, purple for cross-type
      })
      .style('stroke-opacity', 0.7)
      .style('stroke-width', linkData => {
        // Thicker lines for cross-type connections
        const sourceNode = typeof linkData.source === 'object' ? linkData.source : data.nodes.find(n => n.id === linkData.source)
        const targetNode = typeof linkData.target === 'object' ? linkData.target : data.nodes.find(n => n.id === linkData.target)
        
        if (!sourceNode || !targetNode) return 2
        
        const sameType = sourceNode.type === targetNode.type
        return sameType ? 2 : 3
      })
      .style('fill', 'none')
      .style('stroke-dasharray', linkData => {
        // Dashed lines for cross-type connections
        const sourceNode = typeof linkData.source === 'object' ? linkData.source : data.nodes.find(n => n.id === linkData.source)
        const targetNode = typeof linkData.target === 'object' ? linkData.target : data.nodes.find(n => n.id === linkData.target)
        
        if (!sourceNode || !targetNode) return 'none'
        
        const sameType = sourceNode.type === targetNode.type
        return sameType ? 'none' : '5,5'
      })

    // Create arrowheads for directed links
    svgElement.append('defs').selectAll('marker')
      .data(['arrow'])
      .enter().append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .style('fill', '#94A3B8')

    linkElements.attr('marker-end', 'url(#arrow)')
      .attr('d', linkData => {
        const sourceNode = typeof linkData.source === 'object' ? linkData.source : data.nodes.find(node => node.id === linkData.source)
        const targetNode = typeof linkData.target === 'object' ? linkData.target : data.nodes.find(node => node.id === linkData.target)
        
        if (!sourceNode || !targetNode) return ''
        
        return createBundledPath(sourceNode, targetNode)
      })

    // Create node groups
    const nodeGroups = graphContainer.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(data.nodes)
      .enter().append('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')

    // Calculate node dimensions based on text
    const calculateNodeDimensions = (topicName: string) => {
      const maxCharsPerLine = 14
      const words = topicName.split(' ')
      const textLines: string[] = []
      let currentLine = ''
      
      words.forEach(word => {
        if ((currentLine + word).length <= maxCharsPerLine) {
          currentLine += (currentLine ? ' ' : '') + word
        } else {
          if (currentLine) textLines.push(currentLine)
          currentLine = word
        }
      })
      if (currentLine) textLines.push(currentLine)
      
      const maxLineLength = Math.max(...textLines.map(line => line.length))
      const nodeWidth = Math.max(maxLineLength * 7 + 16, 80)
      const nodeHeight = Math.max(textLines.length * 14 + 16, 40)
      
      return { width: nodeWidth, height: nodeHeight, lines: textLines }
    }

    // Add rectangular nodes with names inside (all same shape)
    const nodeRectangles = nodeGroups.append('rect')
      .attr('class', 'node')
      .attr('width', nodeData => calculateNodeDimensions(nodeData.name).width)
      .attr('height', nodeData => calculateNodeDimensions(nodeData.name).height)
      .attr('x', nodeData => -calculateNodeDimensions(nodeData.name).width / 2)
      .attr('y', nodeData => -calculateNodeDimensions(nodeData.name).height / 2)
      .attr('rx', 8) // Rounded corners
      .style('fill', nodeData => getNodeColor(nodeData, nodeData.id === selectedNodeId, false))
      .style('fill-opacity', nodeData => getNodeOpacity(nodeData))
      .style('stroke', nodeData => getStatusBorderColor(nodeData.status))
      .style('stroke-width', 4)
      .style('stroke-opacity', nodeData => getNodeOpacity(nodeData))
      .style('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))')

    // Add multi-line topic names inside nodes
    const labelGroups = nodeGroups.append('g')
      .attr('class', 'node-labels')
      .style('pointer-events', 'none')
      .style('opacity', nodeData => getNodeOpacity(nodeData))
      
    labelGroups.each(function(nodeData) {
      const textDimensions = calculateNodeDimensions(nodeData.name)
      const labelGroup = d3.select(this)
      
      // Add topic type icon as first line
      const topicIcon = nodeData.type === 'THEORY' ? '📚' : 
                       nodeData.type === 'PRACTICE' ? '⚙️' : 
                       nodeData.type === 'PROJECT' ? '🚀' : '❓'
      
      const allLines = [topicIcon, ...textDimensions.lines]
      
      allLines.forEach((line, lineIndex) => {
        labelGroup.append('text')
          .attr('dy', (lineIndex - (allLines.length - 1) / 2) * 14)
          .attr('text-anchor', 'middle')
          .style('font-size', lineIndex === 0 ? '16px' : '11px') // Larger icon
          .style('font-weight', lineIndex === 0 ? 'normal' : 'bold')
          .style('fill', 'white')
          .text(line)
      })
    })

      
    // Add cluster labels for better organization
    const clusterLabels = graphContainer.append('g')
      .attr('class', 'cluster-labels')
      .style('pointer-events', 'none')
    
    const clusters = [
      { type: 'THEORY', x: width / 2 - 200, y: height / 2 - 200, label: '📚 Theory Concepts', color: '#3B82F6' },
      { type: 'PRACTICE', x: width / 2 + 200, y: height / 2 - 200, label: '⚙️ Practical Skills', color: '#10B981' },
      { type: 'PROJECT', x: width / 2, y: height / 2 + 280, label: '🚀 Project Work', color: '#8B5CF6' }
    ]
    
    clusters.forEach(cluster => {
      const labelGroup = clusterLabels.append('g')
        .attr('transform', `translate(${cluster.x}, ${cluster.y})`)
      
      // Background circle
      labelGroup.append('circle')
        .attr('r', 60)
        .style('fill', cluster.color)
        .style('fill-opacity', 0.1)
        .style('stroke', cluster.color)
        .style('stroke-width', 2)
        .style('stroke-dasharray', '5,5')
      
      // Label text
      labelGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', cluster.color)
        .text(cluster.label)
    })

    // Add validation badge for LEARNED_AND_VALIDATED status
    const validationBadges = nodeGroups.filter(nodeData => nodeData.status === 'LEARNED_AND_VALIDATED')
      .append('text')
      .attr('class', 'validation-badge')
      .attr('x', nodeData => calculateNodeDimensions(nodeData.name).width / 2 - 10)
      .attr('y', nodeData => -calculateNodeDimensions(nodeData.name).height / 2 + 14)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('pointer-events', 'none')
      .text('🎓')

    // Add interactions
    nodeGroups
      .on('mouseover', function(event, nodeData) {
        setHoveredNode(nodeData)
        
        // Highlight node
        d3.select(this).select('.node')
          .style('fill', getNodeColor(nodeData, nodeData.id === selectedNodeId, true))
          .style('transform', 'scale(1.05)')
        
        // Highlight connected links
        linkElements.style('stroke-opacity', linkData => 
          (typeof linkData.source === 'object' && linkData.source.id === nodeData.id) ||
          (typeof linkData.target === 'object' && linkData.target.id === nodeData.id) ? 1 : 0.2
        ).style('stroke-width', linkData => 
          (typeof linkData.source === 'object' && linkData.source.id === nodeData.id) ||
          (typeof linkData.target === 'object' && linkData.target.id === nodeData.id) ? 4 : 2
        )
      })
      .on('mouseout', function(event, nodeData) {
        setHoveredNode(null)
        
        // Reset node
        d3.select(this).select('.node')
          .style('fill', getNodeColor(nodeData, nodeData.id === selectedNodeId, false))
          .style('transform', 'scale(1.0)')
        
        // Reset links
        linkElements.style('stroke-opacity', 0.6)
          .style('stroke-width', 2)
      })
      .on('click', function(event, nodeData) {
        onNodeClick?.(nodeData)
        onNodeSelect?.(nodeData)
      })

    // Update positions on tick with enhanced bundled paths
    forceSimulation.on('tick', () => {
      linkElements.attr('d', linkData => {
        const sourceNode = typeof linkData.source === 'object' ? linkData.source : data.nodes.find(node => node.id === linkData.source)
        const targetNode = typeof linkData.target === 'object' ? linkData.target : data.nodes.find(node => node.id === linkData.target)
        
        if (!sourceNode || !targetNode) return ''
        
        return createBundledPath(sourceNode, targetNode)
      })

      nodeGroups.attr('transform', nodeData => `translate(${nodeData.x || 0}, ${nodeData.y || 0})`)
    })

    // Clean up on unmount
    return () => {
      forceSimulation.stop()
    }
  }, [isClientMounted, data, width, height, selectedNodeId, onNodeClick, onNodeSelect])

  if (!isClientMounted) {
    return (
      <div className="relative">
        <div 
          style={{ width, height }}
          className="bg-gradient-to-br from-gray-50 to-indigo-50 rounded-lg shadow-lg border border-gray-200 flex items-center justify-center"
        >
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Loading graph...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="bg-gradient-to-br from-gray-50 to-indigo-50 rounded-lg shadow-lg border border-gray-200"
      />
      

      {/* Collapsible Legend */}
      <div className="absolute bottom-4 left-4">
        {/* Toggle Button */}
        <button
          onClick={() => setIsLegendOpen(!isLegendOpen)}
          className="bg-white p-2 rounded-lg shadow-lg border hover:bg-gray-50 transition-colors mb-2"
        >
          <svg 
            className={`w-5 h-5 text-gray-600 transition-transform ${isLegendOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
          </svg>
        </button>
        
        {/* Legend Content */}
        {isLegendOpen && (
          <div className="bg-white p-4 rounded-lg shadow-lg border min-w-64">
            {/* Clustering Info */}
            <div className="mb-4">
              <h4 className="text-xs font-bold text-gray-700 mb-2">Knowledge Clusters</h4>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-100 border border-blue-500 rounded-full"></div>
                  <span className="text-xs text-gray-600">📚 Theory Concepts</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-100 border border-green-500 rounded-full"></div>
                  <span className="text-xs text-gray-600">⚙️ Practical Skills</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-100 border border-purple-500 rounded-full"></div>
                  <span className="text-xs text-gray-600">🚀 Project Work</span>
                </div>
              </div>
            </div>

            {/* Edge Types */}
            <div className="mb-4">
              <h4 className="text-xs font-bold text-gray-700 mb-2">Connection Types</h4>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-0.5 bg-gray-600"></div>
                  <span className="text-xs text-gray-600">Within cluster</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-0.5 bg-purple-500" style={{backgroundImage: 'repeating-linear-gradient(90deg, currentColor 0, currentColor 3px, transparent 3px, transparent 6px)'}}></div>
                  <span className="text-xs text-gray-600">Cross-cluster</span>
                </div>
              </div>
            </div>
            
            {/* Learning Status */}
            <div>
              <h4 className="text-xs font-bold text-gray-700 mb-2">Learning Status (Border Color)</h4>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-3 bg-gray-300 border-2 border-gray-500 rounded-sm"></div>
                  <span className="text-xs text-gray-600">Not Learned</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-3 bg-gray-300 border-2 border-blue-500 rounded-sm"></div>
                  <span className="text-xs text-gray-600">Want to Learn</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-3 bg-gray-300 border-2 border-yellow-500 rounded-sm"></div>
                  <span className="text-xs text-gray-600">Learning</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-3 bg-gray-300 border-2 border-green-500 rounded-sm"></div>
                  <span className="text-xs text-gray-600">Learned</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-3 bg-gray-300 border-2 border-purple-500 rounded-sm"></div>
                  <span className="text-xs text-gray-600">🎓 Validated</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}