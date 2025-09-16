// Approach 3: Circular Layout with Type Clustering
// Arranges topics in concentric circles by type, with prerequisites pointing inward

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

export default function KnowledgeGraphApproach3({ data, width, height, onNodeClick, onNodeSelect, selectedNodeId }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    console.log('🎨 Approach 3: Circular Layout - rendering', data.nodes.length, 'nodes,', data.links.length, 'links')

    const centerX = width / 2
    const centerY = height / 2
    
    // Group nodes by type
    const nodesByType = {
      THEORY: data.nodes.filter(n => n.type === 'THEORY'),
      PRACTICE: data.nodes.filter(n => n.type === 'PRACTICE'),
      PROJECT: data.nodes.filter(n => n.type === 'PROJECT')
    }

    // Position nodes in concentric circles by type
    const typeRadii = {
      THEORY: Math.min(width, height) * 0.15,      // Inner circle
      PRACTICE: Math.min(width, height) * 0.25,    // Middle circle  
      PROJECT: Math.min(width, height) * 0.35      // Outer circle
    }

    const typeColors = {
      THEORY: '#3B82F6',    // Blue
      PRACTICE: '#10B981',  // Green
      PROJECT: '#8B5CF6'    // Purple
    }

    // Position each node type in its circle
    Object.entries(nodesByType).forEach(([type, nodes]) => {
      const radius = typeRadii[type as keyof typeof typeRadii]
      const angleStep = (2 * Math.PI) / Math.max(nodes.length, 1)
      
      nodes.forEach((node, index) => {
        const angle = index * angleStep
        node.x = centerX + radius * Math.cos(angle)
        node.y = centerY + radius * Math.sin(angle)
      })
    })

    // Create defs for arrow markers
    const defs = svg.append('defs')
    
    defs.append('marker')
      .attr('id', 'arrow-normal')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
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
      .attr('refX', 27)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .style('fill', '#3B82F6')

    // Draw type circle guides (faint)
    Object.entries(typeRadii).forEach(([type, radius]) => {
      svg.append('circle')
        .attr('cx', centerX)
        .attr('cy', centerY)
        .attr('r', radius)
        .style('fill', 'none')
        .style('stroke', typeColors[type as keyof typeof typeColors])
        .style('stroke-width', 1)
        .style('stroke-opacity', 0.2)
        .style('stroke-dasharray', '5,5')
    })

    // Create curved links
    const linkGroup = svg.append('g').attr('class', 'links')
    const links = linkGroup.selectAll('path')
      .data(data.links)
      .enter().append('path')
      .style('stroke', '#94A3B8')
      .style('stroke-width', 2)
      .style('stroke-opacity', 0.6)
      .style('fill', 'none')
      .attr('marker-end', 'url(#arrow-normal)')
      .attr('d', (d: any) => {
        const source = data.nodes.find(n => n.id === (typeof d.source === 'string' ? d.source : d.source.id))
        const target = data.nodes.find(n => n.id === (typeof d.target === 'string' ? d.target : d.target.id))
        
        if (!source || !target || !source.x || !source.y || !target.x || !target.y) return ''
        
        // Create curved path that curves toward center
        const midX = (source.x + target.x) / 2
        const midY = (source.y + target.y) / 2
        
        // Control point closer to center for nice curves
        const controlX = midX + (centerX - midX) * 0.3
        const controlY = midY + (centerY - midY) * 0.3
        
        return `M ${source.x},${source.y} Q ${controlX},${controlY} ${target.x},${target.y}`
      })

    // Node styling functions
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

    // Create node groups
    const nodeGroups = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(data.nodes)
      .enter().append('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')
      .attr('transform', d => `translate(${d.x},${d.y})`)

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

    console.log('📊 Type distribution:', 
      `Theory: ${nodesByType.THEORY.length}, Practice: ${nodesByType.PRACTICE.length}, Project: ${nodesByType.PROJECT.length}`)

  }, [data, width, height, selectedNodeId])

  return (
    <div className="relative">
      <svg ref={svgRef} width={width} height={height} className="border border-gray-200 rounded-lg bg-white">
      </svg>
      
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm border border-gray-200">
        <div className="text-sm font-semibold text-gray-700 mb-2">Approach 3: Circular</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <span>📚</span>
            <span className="text-gray-600">Theory (Inner)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>⚙️</span>
            <span className="text-gray-600">Practice (Middle)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>🚀</span>
            <span className="text-gray-600">Project (Outer)</span>
          </div>
        </div>
      </div>
    </div>
  )
}