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

interface KnowledgeGraphOptimizedProps {
  data: GraphData
  width?: number
  height?: number
  onNodeClick?: (node: GraphNode) => void
  selectedNodeId?: string
  onNodeSelect?: (node: GraphNode | null) => void
}

export default function KnowledgeGraphOptimized({ 
  data, 
  width = 800, 
  height = 600, 
  onNodeClick,
  selectedNodeId,
  onNodeSelect
}: KnowledgeGraphOptimizedProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [isClientMounted, setIsClientMounted] = useState(false)
  const [isLegendOpen, setIsLegendOpen] = useState(false)
  const currentTransformRef = useRef<d3.ZoomTransform | null>(null)

  useEffect(() => {
    setIsClientMounted(true)
  }, [])

  useEffect(() => {
    if (!isClientMounted || !svgRef.current || !data.nodes.length) return

    // Debug: Log incoming data
    console.log('🎨 KnowledgeGraphOptimized - rendering', data.nodes.length, 'nodes,', data.links.length, 'links')

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove()

    const svgElement = d3.select(svgRef.current)
    const graphContainer = svgElement.append('g')

    // Add zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        currentTransformRef.current = event.transform
        graphContainer.attr('transform', event.transform)
      })

    svgElement.call(zoomBehavior)
    
    // Restore previous transform if it exists, otherwise keep default position
    if (currentTransformRef.current) {
      svgElement.call(zoomBehavior.transform, currentTransformRef.current)
    }

    // Optimized Dagre-style Layout Algorithm
    const optimizedGraphLayout = () => {
      console.log('🎨 Optimized Dagre Layout - rendering', data.nodes.length, 'nodes,', data.links.length, 'links')

      // Build adjacency list for topological sorting
      const adjacencyList = new Map<string, string[]>()
      const inDegree = new Map<string, number>()
      
      data.nodes.forEach(node => {
        adjacencyList.set(node.id, [])
        inDegree.set(node.id, 0)
      })
      
      data.links.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id
        const targetId = typeof link.target === 'string' ? link.target : link.target.id
        
        adjacencyList.get(sourceId)?.push(targetId)
        inDegree.set(targetId, (inDegree.get(targetId) || 0) + 1)
      })

      // Topological sort to determine layers
      const layers: string[][] = []
      const queue: string[] = []
      const tempInDegree = new Map(inDegree)
      
      // Find initial nodes with no dependencies
      tempInDegree.forEach((degree, nodeId) => {
        if (degree === 0) {
          queue.push(nodeId)
        }
      })
      
      // Process layers
      while (queue.length > 0) {
        const currentLayer: string[] = []
        const layerSize = queue.length
        
        for (let i = 0; i < layerSize; i++) {
          const nodeId = queue.shift()!
          currentLayer.push(nodeId)
          
          // Process neighbors
          adjacencyList.get(nodeId)?.forEach(neighborId => {
            const newInDegree = (tempInDegree.get(neighborId) || 0) - 1
            tempInDegree.set(neighborId, newInDegree)
            if (newInDegree === 0) {
              queue.push(neighborId)
            }
          })
        }
        
        if (currentLayer.length > 0) {
          layers.push(currentLayer)
        }
      }

      console.log('📊 Initial layers:', layers.map((layer, i) => `Layer ${i}: ${layer.length} nodes`).join(', '))
      
      // Optimize layer positions to minimize arrow distances
      const optimizeStart = performance.now()
      const optimizeLayers = () => {
        let improved = true
        let iterations = 0
        const maxIterations = 3 // Performance optimized
        
        while (improved && iterations < maxIterations) {
          improved = false
          iterations++
          
          // For each node, try to move it closer to its dependents
          for (let layerIndex = 0; layerIndex < layers.length - 1; layerIndex++) {
            const currentLayer = layers[layerIndex]
            
            // Check each node in current layer
            for (const nodeId of [...currentLayer]) {
              // Find all dependents of this node
              const dependents = data.links
                .filter(link => {
                  const sourceId = typeof link.source === 'string' ? link.source : link.source.id
                  return sourceId === nodeId
                })
                .map(link => typeof link.target === 'string' ? link.target : link.target.id)
              
              // Check if we can move this node up one layer
              if (dependents.length > 0) {
                // Find what layer the dependents are in
                const dependentLayers = dependents.map(depId => {
                  for (let i = 0; i < layers.length; i++) {
                    if (layers[i].includes(depId)) return i
                  }
                  return -1
                }).filter(l => l !== -1)
                
                if (dependentLayers.length > 0) {
                  const minDependentLayer = Math.min(...dependentLayers)
                  
                  // If dependents are in next layer or further, try moving up
                  if (minDependentLayer > layerIndex + 1) {
                    // Check if all prerequisites of this node are still satisfied
                    const prerequisites = data.links
                      .filter(link => {
                        const targetId = typeof link.target === 'string' ? link.target : link.target.id
                        return targetId === nodeId
                      })
                      .map(link => typeof link.source === 'string' ? link.source : link.source.id)
                    
                    // Find the maximum layer of prerequisites
                    const prereqLayers = prerequisites.map(prereqId => {
                      for (let i = 0; i < layers.length; i++) {
                        if (layers[i].includes(prereqId)) return i
                      }
                      return -1
                    }).filter(l => l !== -1)
                    
                    const maxPrereqLayer = prereqLayers.length > 0 ? Math.max(...prereqLayers) : -1
                    
                    // Can move up if we stay above all prerequisites
                    const targetLayer = Math.min(minDependentLayer - 1, layerIndex + 1)
                    if (targetLayer > maxPrereqLayer) {
                      // Move the node up
                      currentLayer.splice(currentLayer.indexOf(nodeId), 1)
                      layers[targetLayer].push(nodeId)
                      improved = true
                      console.log(`📈 Moved ${data.nodes.find(n => n.id === nodeId)?.name} from layer ${layerIndex} to ${targetLayer}`)
                    }
                  }
                }
              }
            }
          }
        }
        
        console.log(`📊 Optimization complete after ${iterations} iterations`)
        console.log('📊 Final layers:', layers.map((layer, i) => `Layer ${i}: ${layer.length} nodes`).join(', '))
      }
      
      optimizeLayers()
      const optimizeTime = performance.now() - optimizeStart
      console.log(`⚡ Layer optimization took ${Math.round(optimizeTime)}ms`)

      // Position nodes in optimized layers (bottom to top)
      const layerSpacing = Math.max(120, (height - 100) / Math.max(layers.length - 1, 1))
      const nodeSpacing = 120
      
      // Reverse layers to show bottom-to-top (dependencies at bottom)
      const reversedLayers = [...layers].reverse()
      
      reversedLayers.forEach((layer, layerIndex) => {
        const layerY = 50 + layerIndex * layerSpacing
        const totalWidth = Math.max((layer.length - 1) * nodeSpacing, 0)
        const startX = (width - totalWidth) / 2
        
        layer.forEach((nodeId, nodeIndex) => {
          const node = data.nodes.find(n => n.id === nodeId)
          if (node) {
            node.x = startX + nodeIndex * nodeSpacing
            node.y = layerY
            // Set fixed positions for this layout
            node.fx = node.x
            node.fy = node.y
          }
        })
      })
      
      // Create node levels mapping for compatibility
      const nodeLevels: Record<string, number> = {}
      layers.forEach((layer, layerIndex) => {
        layer.forEach(nodeId => {
          nodeLevels[nodeId] = layerIndex
        })
      })
      
      const maxLevel = layers.length - 1
      
      return { nodeLevels, maxLevel, componentCount: 1 }
    }

    const { nodeLevels, maxLevel, componentCount } = optimizedGraphLayout()

    // Smart arrow routing function
    const createSmartPath = (sourceNode: GraphNode, targetNode: GraphNode) => {
      if (!sourceNode || !targetNode || !sourceNode.x || !sourceNode.y || !targetNode.x || !targetNode.y) {
        return ''
      }
      
      const sourceDims = calculateNodeDimensions(sourceNode.name)
      const targetDims = calculateNodeDimensions(targetNode.name)
      
      const startX = sourceNode.x
      const startY = sourceNode.y - sourceDims.height / 2
      const endX = targetNode.x
      const endY = targetNode.y + targetDims.height / 2
      
      // Simple logic: if arrows are in same column and far apart, add slight curve
      const deltaX = Math.abs(endX - startX)
      const deltaY = Math.abs(endY - startY)
      
      // If very close horizontally but far vertically, add small curve
      if (deltaX < 50 && deltaY > 200) {
        const midY = startY + (endY - startY) / 2
        // Use deterministic offset based on source/target IDs to avoid randomness
        const hash = (sourceNode.id + targetNode.id).split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0)
          return a & a
        }, 0)
        const curveX = startX + (hash % 40 - 20) // Deterministic offset between -20 and 20
        return `M ${startX},${startY} Q ${curveX},${midY} ${endX},${endY}`
      }
      
      // Otherwise use straight line
      return `M ${startX},${startY} L ${endX},${endY}`
    }

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



    const getStatusBorderColor = (status: string | undefined) => {
      const colors = {
        NOT_LEARNED: '#9CA3AF',
        WANT_TO_LEARN: '#3B82F6',
        LEARNING: '#F59E0B',
        LEARNED: '#10B981',
        LEARNED_AND_VALIDATED: '#8B5CF6'
      }
      return colors[status as keyof typeof colors] || '#9CA3AF'
    }

    // Create arrowheads for directed links
    const defs = svgElement.append('defs')
    
    // Regular arrow for normal links
    defs.append('marker')
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
    
    // Highlighted arrow for thick links
    defs.append('marker')
      .attr('id', 'arrow-highlighted')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 27)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .style('fill', '#94A3B8')

    // Create enhanced links with smart routing
    const linkElements = graphContainer.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(data.links)
      .enter().append('path')
      .attr('class', 'link')
      .style('stroke', '#94A3B8')
      .style('stroke-opacity', 0.6)
      .style('stroke-width', 2)
      .style('fill', 'none')
      .attr('marker-end', 'url(#arrow)')
      .attr('d', linkData => {
        const sourceNode = typeof linkData.source === 'object' ? linkData.source : data.nodes.find(node => node.id === linkData.source)
        const targetNode = typeof linkData.target === 'object' ? linkData.target : data.nodes.find(node => node.id === linkData.target)
        
        if (!sourceNode || !targetNode) return ''
        
        return createSmartPath(sourceNode, targetNode)
      })

    // Create node groups
    const nodeGroups = graphContainer.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(data.nodes)
      .enter().append('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')
      .attr('transform', nodeData => `translate(${nodeData.x || 0}, ${nodeData.y || 0})`)

    // Add rectangular nodes with names inside (preserve existing styling)
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

    // Add multi-line topic names inside nodes (preserve existing styling)
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
          .style('fill', lineIndex === 0 ? '#374151' : '#111827') // Dark text for better contrast on light backgrounds
          .text(line)
      })
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

    // Add interactions (preserve existing behavior)
    nodeGroups
      .on('mouseover', function(event, nodeData) {
        setHoveredNode(nodeData)
        
        // Highlight node
        d3.select(this).select('.node')
          .style('fill', getNodeColor(nodeData, nodeData.id === selectedNodeId, true))
          .style('transform', 'scale(1.05)')
        
        // Highlight connected links
        linkElements.style('stroke-opacity', linkData => {
          const sourceId = typeof linkData.source === 'object' ? linkData.source.id : linkData.source
          const targetId = typeof linkData.target === 'object' ? linkData.target.id : linkData.target
          return (sourceId === nodeData.id || targetId === nodeData.id) ? 1 : 0.2
        }).style('stroke-width', linkData => {
          const sourceId = typeof linkData.source === 'object' ? linkData.source.id : linkData.source
          const targetId = typeof linkData.target === 'object' ? linkData.target.id : linkData.target
          return (sourceId === nodeData.id || targetId === nodeData.id) ? 4 : 2
        }).attr('marker-end', linkData => {
          const sourceId = typeof linkData.source === 'object' ? linkData.source.id : linkData.source
          const targetId = typeof linkData.target === 'object' ? linkData.target.id : linkData.target
          return (sourceId === nodeData.id || targetId === nodeData.id) ? 'url(#arrow-highlighted)' : 'url(#arrow)'
        })
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
          .attr('marker-end', 'url(#arrow)')
      })
      .on('click', function(event, nodeData) {
        if (onNodeClick) onNodeClick(nodeData)
        if (onNodeSelect) onNodeSelect(nodeData)
      })

    // Clean up on unmount
    return () => {
      // No force simulation to stop
    }
  }, [isClientMounted, data, width, height, onNodeClick, onNodeSelect])

  // Handle visual updates for selected nodes without recreating the graph
  useEffect(() => {
    if (!isClientMounted || !svgRef.current) return

    const svgElement = d3.select(svgRef.current)
    
    // Update node colors for selection state
    svgElement.selectAll('.node')
      .style('fill', function(d: any) {
        const element = this as Element
        const parentElement = element?.parentElement
        if (!parentElement) return '#F3F4F6' // Default gray if no parent
        const nodeData = d3.select(parentElement as any).datum() as GraphNode
        return getNodeColor(nodeData, nodeData.id === selectedNodeId, false)
      })
  }, [selectedNodeId, isClientMounted])

  // Define color functions at component level for reuse
  const getNodeColor = (nodeData: GraphNode, isSelected: boolean, isHovered: boolean) => {
    if (isSelected) return '#DBEAFE' // Light blue for selected
    if (isHovered) return '#F3F4F6' // Light gray for hover
    
    // Status-based background colors (CLAUDE.md specification)
    const statusColors = {
      NOT_LEARNED: '#F3F4F6',        // Gray
      WANT_TO_LEARN: '#DBEAFE',      // Blue  
      LEARNING: '#FEF3C7',           // Yellow
      LEARNED: '#D1FAE5',            // Green
      LEARNED_AND_VALIDATED: '#F3E8FF' // Purple
    }
    
    return statusColors[nodeData.status as keyof typeof statusColors] || '#F3F4F6'
  }

  const getNodeOpacity = (nodeData: GraphNode) => {
    return nodeData.highlighted ? 1.0 : 0.6
  }

  if (!isClientMounted) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="text-gray-500">Loading graph...</div>
      </div>
    )
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border border-gray-200 rounded-lg bg-white"
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {/* Legend Content */}
        {isLegendOpen && (
          <div className="bg-white p-4 rounded-lg shadow-lg border min-w-64">
            {/* Topic Types */}
            <div className="mb-4">
              <h4 className="text-xs font-bold text-gray-700 mb-2">Topic Types (Pictograms)</h4>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-base">📚</span>
                  <span className="text-xs text-gray-600">Theory Concepts</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-base">⚙️</span>
                  <span className="text-xs text-gray-600">Practical Skills</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-base">🚀</span>
                  <span className="text-xs text-gray-600">Project Work</span>
                </div>
              </div>
            </div>

            {/* Learning Status */}
            <div>
              <h4 className="text-xs font-bold text-gray-700 mb-2">Learning Status (Background Colors)</h4>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-3 bg-gray-100 border border-gray-300 rounded-sm"></div>
                  <span className="text-xs text-gray-600">Not Learned</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-3 bg-blue-100 border border-blue-300 rounded-sm"></div>
                  <span className="text-xs text-gray-600">Want to Learn</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-3 bg-yellow-100 border border-yellow-300 rounded-sm"></div>
                  <span className="text-xs text-gray-600">Learning</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-3 bg-green-100 border border-green-300 rounded-sm"></div>
                  <span className="text-xs text-gray-600">Learned</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-3 bg-purple-100 border border-purple-300 rounded-sm"></div>
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