// Approach 5: Dagre Layout (Directed Graph)
// Uses Dagre algorithm for automatic hierarchical layout of directed graphs

'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface GraphNode {
  id: string
  name: string
  slug: string
  type: string
  description?: string
  keypoints?: string
  status?: string
  highlighted?: boolean
  x?: number
  y?: number
}

interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  value: number
}

interface Props {
  data: { nodes: GraphNode[]; links: GraphLink[]; highlightType?: string }
  width: number
  height: number
  onNodeClick?: (node: GraphNode) => void
  onNodeSelect?: (node: GraphNode | null) => void
  selectedNodeId?: string
}

export default function KnowledgeGraphApproach5({ data, width, height, onNodeClick, onNodeSelect, selectedNodeId }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    console.log('🎨 Approach 5: Dagre-style Layout - rendering', data.nodes.length, 'nodes,', data.links.length, 'links')

    // Simple Dagre-inspired layout algorithm
    const nodeDimensions = new Map<string, {width: number, height: number}>()
    
    // Calculate node dimensions
    const calculateNodeDimensions = (name: string) => {
      const maxCharsPerLine = 14
      const words = name.split(' ')
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

    // Store dimensions for each node
    data.nodes.forEach(node => {
      const dims = calculateNodeDimensions(node.name)
      nodeDimensions.set(node.id, dims)
    })

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

    console.log('📊 Dagre layers:', layers.map((layer, i) => `Layer ${i}: ${layer.length} nodes`).join(', '))

    // Position nodes in layers (bottom to top)
    const layerSpacing = Math.max(80, (height - 100) / Math.max(layers.length - 1, 1))
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
        }
      })
    })

    // Create defs for arrow markers
    const defs = svg.append('defs')
    
    defs.append('marker')
      .attr('id', 'arrow-normal')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 10)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .style('fill', '#94A3B8')

    defs.append('marker')
      .attr('id', 'arrow-highlight')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 10)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .style('fill', '#3B82F6')

    // Create links with edge positioning
    const linkGroup = svg.append('g').attr('class', 'links')
    const links = linkGroup.selectAll('line')
      .data(data.links)
      .enter().append('line')
      .style('stroke', '#94A3B8')
      .style('stroke-width', 2)
      .style('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#arrow-normal)')
      .attr('x1', (d: any) => {
        const source = data.nodes.find(n => n.id === (typeof d.source === 'string' ? d.source : d.source.id))
        return source?.x || 0
      })
      .attr('y1', (d: any) => {
        const source = data.nodes.find(n => n.id === (typeof d.source === 'string' ? d.source : d.source.id))
        if (!source) return 0
        const sourceDims = calculateNodeDimensions(source.name)
        return (source.y || 0) - sourceDims.height / 2 // Top edge of source
      })
      .attr('x2', (d: any) => {
        const target = data.nodes.find(n => n.id === (typeof d.target === 'string' ? d.target : d.target.id))
        return target?.x || 0
      })
      .attr('y2', (d: any) => {
        const target = data.nodes.find(n => n.id === (typeof d.target === 'string' ? d.target : d.target.id))
        if (!target) return 0
        const targetDims = calculateNodeDimensions(target.name)
        return (target.y || 0) + targetDims.height / 2 // Bottom edge of target
      })

    // Node styling functions
    const getStatusBorderColor = (status: string | undefined) => {
      const colors = {
        NOT_LEARNED: '#9CA3AF',
        WANT_TO_LEARN: '#3B82F6',
        LEARNING: '#F59E0B',
        LEARNED: '#10B981',
        LEARNED_AND_VALIDATED: '#8B5CF6'
      }
      return colors[status as keyof typeof colors] || colors.NOT_LEARNED
    }

    const getNodeOpacity = (node: GraphNode) => node.highlighted === false ? 0.4 : 1.0
    const getNodeColor = (node: GraphNode, isSelected: boolean) => {
      if (isSelected) return '#1F2937'
      if (node.highlighted === false) return '#9CA3AF'
      return '#6B7280'
    }

    // Create node groups with hover effects
    const nodeGroups = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(data.nodes)
      .enter().append('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .on('mouseenter', function(event, d) {
        // Highlight related arrows on hover
        links.style('stroke', (linkData: any) => {
          const sourceId = typeof linkData.source === 'string' ? linkData.source : linkData.source.id
          const targetId = typeof linkData.target === 'string' ? linkData.target : linkData.target.id
          return (sourceId === d.id || targetId === d.id) ? '#3B82F6' : '#94A3B8'
        })
        .style('stroke-width', (linkData: any) => {
          const sourceId = typeof linkData.source === 'string' ? linkData.source : linkData.source.id
          const targetId = typeof linkData.target === 'string' ? linkData.target : linkData.target.id
          return (sourceId === d.id || targetId === d.id) ? 3 : 2
        })
        .attr('marker-end', (linkData: any) => {
          const sourceId = typeof linkData.source === 'string' ? linkData.source : linkData.source.id
          const targetId = typeof linkData.target === 'string' ? linkData.target : linkData.target.id
          return (sourceId === d.id || targetId === d.id) ? 'url(#arrow-highlight)' : 'url(#arrow-normal)'
        })
      })
      .on('mouseleave', function(event, d) {
        // Reset arrow styles
        links.style('stroke', '#94A3B8')
        .style('stroke-width', 2)
        .attr('marker-end', 'url(#arrow-normal)')
      })

    // Add rectangles
    nodeGroups.append('rect')
      .attr('width', d => calculateNodeDimensions(d.name).width)
      .attr('height', d => calculateNodeDimensions(d.name).height)
      .attr('x', d => -calculateNodeDimensions(d.name).width / 2)
      .attr('y', d => -calculateNodeDimensions(d.name).height / 2)
      .attr('rx', 8)
      .style('fill', d => getNodeColor(d, d.id === selectedNodeId))
      .style('fill-opacity', d => getNodeOpacity(d))
      .style('stroke', d => getStatusBorderColor(d.status))
      .style('stroke-width', 4)
      .style('stroke-opacity', d => getNodeOpacity(d))
      .style('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))')

    // Add labels
    const labelGroups = nodeGroups.append('g')
      .attr('class', 'node-labels')
      .style('pointer-events', 'none')
      .style('opacity', d => getNodeOpacity(d))

    labelGroups.each(function(d) {
      const textDimensions = calculateNodeDimensions(d.name)
      const labelGroup = d3.select(this)
      
      const topicIcon = d.type === 'THEORY' ? '📚' : d.type === 'PRACTICE' ? '⚙️' : '🚀'
      
      labelGroup.append('text')
        .text(topicIcon)
        .attr('text-anchor', 'middle')
        .attr('y', -textDimensions.lines.length * 7 + 2)
        .style('font-size', '16px')
      
      textDimensions.lines.forEach((line, index) => {
        labelGroup.append('text')
          .text(line)
          .attr('text-anchor', 'middle')
          .attr('y', (index - Math.floor(textDimensions.lines.length / 2)) * 14 + 8)
          .style('font-family', 'Inter, system-ui, sans-serif')
          .style('font-size', '11px')
          .style('font-weight', '500')
          .style('fill', '#FFFFFF')
      })
    })

    // Click handlers
    nodeGroups.on('click', (event, d) => {
      event.stopPropagation()
      onNodeClick?.(d)
      onNodeSelect?.(d)
    })

    svg.on('click', () => onNodeSelect?.(null))

  }, [data, width, height, selectedNodeId])

  return (
    <div className="relative">
      <svg ref={svgRef} width={width} height={height} className="border border-gray-200 rounded-lg bg-white">
      </svg>
      
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm border border-gray-200">
        <div className="text-sm font-semibold text-gray-700 mb-2">Approach 5: Dagre-style</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <span>📚</span>
            <span className="text-gray-600">Theory</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>⚙️</span>
            <span className="text-gray-600">Practice</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>🚀</span>
            <span className="text-gray-600">Project</span>
          </div>
        </div>
      </div>
    </div>
  )
}