// Approach 2: Hierarchical Layout (Top-Down Levels)
// Places topics in levels based on prerequisite depth, arranged top-to-bottom

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
  level?: number
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

export default function KnowledgeGraphApproach2({ data, width, height, onNodeClick, onNodeSelect, selectedNodeId }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    console.log('🎨 Approach 2: Hierarchical Layout - rendering', data.nodes.length, 'nodes,', data.links.length, 'links')

    // Calculate levels based on prerequisite depth
    const nodeLevels: Record<string, number> = {}
    const visited = new Set<string>()
    
    const calculateLevel = (nodeId: string): number => {
      if (visited.has(nodeId)) return nodeLevels[nodeId] || 0
      visited.add(nodeId)
      
      const prerequisites = data.links.filter(link => {
        const targetId = typeof link.target === 'string' ? link.target : link.target.id
        return targetId === nodeId
      })
      
      if (prerequisites.length === 0) {
        nodeLevels[nodeId] = 0
        return 0
      }
      
      const maxPrereqLevel = Math.max(...prerequisites.map(link => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id
        return calculateLevel(sourceId)
      }))
      
      nodeLevels[nodeId] = maxPrereqLevel + 1
      return nodeLevels[nodeId]
    }
    
    // Calculate levels for all nodes
    data.nodes.forEach(node => calculateLevel(node.id))
    const maxLevel = Math.max(...Object.values(nodeLevels))
    
    // Group nodes by level
    const nodesByLevel: Record<number, GraphNode[]> = {}
    data.nodes.forEach(node => {
      const level = nodeLevels[node.id]
      if (!nodesByLevel[level]) nodesByLevel[level] = []
      nodesByLevel[level].push(node)
    })

    // Position nodes
    const levelHeight = height / (maxLevel + 2)
    data.nodes.forEach(node => {
      const level = nodeLevels[node.id]
      const nodesInLevel = nodesByLevel[level]
      const levelWidth = width / (nodesInLevel.length + 1)
      const indexInLevel = nodesInLevel.indexOf(node)
      
      node.x = levelWidth * (indexInLevel + 1)
      node.y = levelHeight * (level + 1)
      node.level = level
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

    // Create links as straight lines
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
        return source?.y || 0
      })
      .attr('x2', (d: any) => {
        const target = data.nodes.find(n => n.id === (typeof d.target === 'string' ? d.target : d.target.id))
        return target?.x || 0
      })
      .attr('y2', (d: any) => {
        const target = data.nodes.find(n => n.id === (typeof d.target === 'string' ? d.target : d.target.id))
        return target?.y || 0
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

    console.log('📊 Level distribution:', 
      Object.keys(nodesByLevel).map(level => `Level ${level}: ${nodesByLevel[parseInt(level)].length} nodes`).join(', '))

  }, [data, width, height, selectedNodeId])

  return (
    <div className="relative">
      <svg ref={svgRef} width={width} height={height} className="border border-gray-200 rounded-lg bg-white">
      </svg>
      
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm border border-gray-200">
        <div className="text-sm font-semibold text-gray-700 mb-2">Approach 2: Hierarchical</div>
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