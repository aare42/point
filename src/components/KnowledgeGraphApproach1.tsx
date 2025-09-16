// Approach 1: Simple Force Layout (Classic D3)
// Basic force-directed graph with charge, collision, and center forces

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

export default function KnowledgeGraphApproach1({ data, width, height, onNodeClick, onNodeSelect, selectedNodeId }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    console.log('🎨 Approach 1: Simple Force Layout - rendering', data.nodes.length, 'nodes,', data.links.length, 'links')

    // Create defs for arrow markers
    const defs = svg.append('defs')
    
    // Normal arrow
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

    // Highlighted arrow
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

    // Create simulation
    const simulation = d3.forceSimulation<GraphNode>(data.nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(data.links)
        .id(d => d.id)
        .distance(120)
        .strength(0.5))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('collision', d3.forceCollide().radius(50))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .alpha(0.3)
      .alphaDecay(0.02)

    // Create links
    const linkGroup = svg.append('g').attr('class', 'links')
    const links = linkGroup.selectAll('line')
      .data(data.links)
      .enter().append('line')
      .style('stroke', '#94A3B8')
      .style('stroke-width', 2)
      .style('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#arrow-normal)')

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

    // Status colors
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
      .call(d3.drag<any, GraphNode>()
        .on('start', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event, d: any) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null
          d.fy = null
        }))

    // Add rectangles
    const nodeRects = nodeGroups.append('rect')
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

    // Simulation tick
    simulation.on('tick', () => {
      links
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      nodeGroups
        .attr('transform', d => `translate(${d.x},${d.y})`)
    })

    // Clear selection on background click
    svg.on('click', () => onNodeSelect?.(null))

    // Cleanup
    return () => {
      simulation.stop()
    }

  }, [data, width, height, selectedNodeId])

  return (
    <div className="relative">
      <svg ref={svgRef} width={width} height={height} className="border border-gray-200 rounded-lg bg-white">
      </svg>
      
      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm border border-gray-200">
        <div className="text-sm font-semibold text-gray-700 mb-2">Approach 1: Simple Force</div>
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