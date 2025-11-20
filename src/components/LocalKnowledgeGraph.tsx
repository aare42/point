'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { TopicType } from '@prisma/client'

interface LocalTopic {
  id: string
  name: any // Multilingual object
  slug: string
  type: TopicType
  description?: any
  keypoints?: any
  status?: string
  prerequisiteCount: number
  effectCount: number
}

interface LocalGraphLink {
  source: string
  target: string
  value: number
}

interface LocalGraphData {
  center: LocalTopic
  prerequisites: LocalTopic[]
  effects: LocalTopic[]
  links: LocalGraphLink[]
}

interface LocalKnowledgeGraphProps {
  centerTopicId: string
  width?: number
  height?: number
  onTopicSelect?: (topic: LocalTopic | null) => void
  onRecenter?: (topicId: string) => void
  language?: string
}

interface GraphNode extends LocalTopic {
  x?: number
  y?: number
  fx?: number
  fy?: number
  level: number // -1 for prerequisites, 0 for center, 1 for effects
  isExpanded?: boolean
}

export default function LocalKnowledgeGraph({
  centerTopicId,
  width = 800,
  height = 600,
  onTopicSelect,
  onRecenter,
  language = 'uk'
}: LocalKnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [graphData, setGraphData] = useState<LocalGraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  const [selectedTopic, setSelectedTopic] = useState<LocalTopic | null>(null)
  const [isClientMounted, setIsClientMounted] = useState(false)
  
  // Persistent position storage to survive React re-renders
  const persistentNodePositions = useRef<Record<string, {x: number, y: number}>>({})

  useEffect(() => {
    setIsClientMounted(true)
  }, [])

  // Fetch initial local graph data
  const fetchLocalGraphData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Clear persistent positions when center topic changes
      persistentNodePositions.current = {}
      console.log('🧹 Cleared persistent positions for new center topic:', centerTopicId)
      
      const response = await fetch(`/api/topics/local-graph/${centerTopicId}?lang=${language}`)
      if (response.ok) {
        const data = await response.json()
        setGraphData(data)
        
        // Reset expanded state when center changes, but mark center topic's 
        // immediate prerequisites and effects as expanded (since they're shown by default)
        const initialExpanded = new Set<string>()
        
        // Mark center's prerequisites as expanded if they exist
        if (data.prerequisites.length > 0) {
          initialExpanded.add(`${centerTopicId}-prerequisites`)
        }
        
        // Mark center's effects as expanded if they exist
        if (data.effects.length > 0) {
          initialExpanded.add(`${centerTopicId}-effects`)
        }
        
        setExpandedTopics(initialExpanded)
        setSelectedTopic(data.center)
        onTopicSelect?.(data.center)
      } else {
        console.error('Failed to fetch local graph data')
      }
    } catch (error) {
      console.error('Error fetching local graph data:', error)
    } finally {
      setLoading(false)
    }
  }, [centerTopicId, language, onTopicSelect])

  // Expand/collapse topic's prerequisites or effects
  const handleExpansion = async (topicId: string, direction: 'prerequisites' | 'effects') => {
    try {
      const expansionKey = `${topicId}-${direction}`
      
      if (expandedTopics.has(expansionKey)) {
        // Collapse - remove all descendant expansions (cascade collapse)
        const newExpanded = new Set(expandedTopics)
        
        // Remove this specific expansion
        newExpanded.delete(expansionKey)
        
        // Remove only descendant expansions in the same direction
        // (don't remove the other direction's expansion for the same topic)
        expandedTopics.forEach(key => {
          // Only remove keys that are descendants, not sibling directions
          if (key !== expansionKey && key.includes(`-${topicId}-`)) {
            // This is a descendant expansion (e.g., grandchild topics)
            newExpanded.delete(key)
          }
        })
        setExpandedTopics(newExpanded)
        
        // Remove collapsed topics from graph data
        if (graphData) {
          // Find topics that were added by this expansion
          const topicsToRemove = new Set<string>()
          
          // For prerequisites collapse, remove topics that have topicId as their target in links
          // For effects collapse, remove topics that have topicId as their source in links
          graphData.links.forEach(link => {
            if (direction === 'prerequisites' && link.target === topicId) {
              topicsToRemove.add(link.source)
            } else if (direction === 'effects' && link.source === topicId) {
              topicsToRemove.add(link.target)
            }
          })
          
          // Also remove any further expansions from these topics
          const removeDescendants = (nodeId: string) => {
            graphData.links.forEach(link => {
              if (direction === 'prerequisites' && link.target === nodeId) {
                const sourceId = link.source
                if (sourceId !== centerTopicId) { // Don't remove center topic
                  topicsToRemove.add(sourceId)
                  removeDescendants(sourceId)
                }
              } else if (direction === 'effects' && link.source === nodeId) {
                const targetId = link.target
                if (targetId !== centerTopicId) { // Don't remove center topic
                  topicsToRemove.add(targetId)
                  removeDescendants(targetId)
                }
              }
            })
          }
          
          Array.from(topicsToRemove).forEach(nodeId => removeDescendants(nodeId))
          
          // Update graph data by filtering out removed topics and links
          const updatedData = {
            ...graphData,
            prerequisites: graphData.prerequisites.filter(topic => !topicsToRemove.has(topic.id)),
            effects: graphData.effects.filter(topic => !topicsToRemove.has(topic.id)),
            links: graphData.links.filter(link => 
              !topicsToRemove.has(link.source) && !topicsToRemove.has(link.target)
            )
          }
          setGraphData(updatedData)
        }
      } else {
        // Expand - fetch new data
        const response = await fetch(`/api/topics/local-graph/${centerTopicId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expandTopicId: topicId,
            expandDirection: direction
          })
        })
        
        if (response.ok) {
          const expansionData = await response.json()
          const newExpanded = new Set(expandedTopics)
          newExpanded.add(expansionKey)
          setExpandedTopics(newExpanded)
          
          // Update graph data with new topics and links
          if (graphData) {
            console.log('🔄 Updating graphData - Current topics:', graphData.prerequisites.length + graphData.effects.length + 1)
            const updatedData = {
              ...graphData,
              // Add new topics to appropriate array
              prerequisites: direction === 'prerequisites' 
                ? [...graphData.prerequisites, ...expansionData.topics]
                : graphData.prerequisites,
              effects: direction === 'effects'
                ? [...graphData.effects, ...expansionData.topics]
                : graphData.effects,
              // Add new links
              links: [...graphData.links, ...expansionData.links]
            }
            console.log('✨ Updated graphData - New topics:', updatedData.prerequisites.length + updatedData.effects.length + 1, 'direction:', direction, 'added:', expansionData.topics.length)
            setGraphData(updatedData)
          }
        }
      }
    } catch (error) {
      console.error('Error handling expansion:', error)
    }
  }

  // Double-click to recenter
  const handleDoubleClick = (topic: LocalTopic) => {
    if (topic.id !== centerTopicId) {
      onRecenter?.(topic.id)
    }
  }

  // Calculate the proper level for each node based on tree hierarchy
  const calculateNodeLevels = (): Record<string, number> => {
    if (!graphData) return {}

    const levels: Record<string, number> = {}
    const visited = new Set<string>()
    
    // Center topic is always level 0
    levels[graphData.center.id] = 0
    visited.add(graphData.center.id)
    
    // Calculate levels using BFS to ensure proper ordering
    const queue: Array<{nodeId: string, level: number}> = [{nodeId: graphData.center.id, level: 0}]
    
    while (queue.length > 0) {
      const {nodeId, level} = queue.shift()!
      
      // Find all links connected to this node
      graphData.links.forEach(link => {
        // Prerequisites (incoming links) are at level - 1
        if (link.target === nodeId && !visited.has(link.source)) {
          const newLevel = level - 1
          levels[link.source] = newLevel
          visited.add(link.source)
          queue.push({nodeId: link.source, level: newLevel})
        }
        
        // Effects (outgoing links) are at level + 1
        if (link.source === nodeId && !visited.has(link.target)) {
          const newLevel = level + 1
          levels[link.target] = newLevel
          visited.add(link.target)
          queue.push({nodeId: link.target, level: newLevel})
        }
      })
    }
    
    return levels
  }

  // Prepare graph nodes for D3
  const prepareGraphNodes = (): GraphNode[] => {
    if (!graphData) return []

    const levels = calculateNodeLevels()
    const nodes: GraphNode[] = []
    
    // Center topic (level 0)
    nodes.push({
      ...graphData.center,
      level: levels[graphData.center.id] || 0
    })

    // Prerequisites with calculated levels
    graphData.prerequisites.forEach(topic => {
      nodes.push({
        ...topic,
        level: levels[topic.id] || -1
      })
    })

    // Effects with calculated levels  
    graphData.effects.forEach(topic => {
      nodes.push({
        ...topic,
        level: levels[topic.id] || 1
      })
    })

    return nodes
  }

  // Get localized text (simplified version)
  const getLocalizedText = (text: any): string => {
    if (typeof text === 'string') {
      try {
        const parsed = JSON.parse(text)
        return parsed[language] || parsed['uk'] || parsed['en'] || text
      } catch {
        return text
      }
    }
    if (typeof text === 'object' && text) {
      return text[language] || text['uk'] || text['en'] || JSON.stringify(text)
    }
    return String(text || '')
  }

  // Status colors
  const getStatusBorderColor = (status: string) => {
    const colors = {
      NOT_LEARNED: '#9CA3AF',
      WANT_TO_LEARN: '#3B82F6',
      LEARNING: '#F59E0B',
      LEARNED: '#10B981',
      LEARNED_AND_VALIDATED: '#8B5CF6'
    }
    return colors[status as keyof typeof colors] || colors.NOT_LEARNED
  }

  // Node colors
  const getNodeColor = (node: GraphNode, isSelected: boolean) => {
    if (isSelected) return '#1F2937'
    return '#6B7280'
  }

  // Calculate node dimensions
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

  // Zone expansion algorithm - parent zones grow to fit children
  const layoutNodes = (nodes: GraphNode[]) => {
    console.log('🚨 ZONE EXPANSION ALGORITHM STARTED with', nodes.length, 'nodes')
    
    // 1) Build relationships  
    const children: Record<string, string[]> = {}
    const parents: Record<string, string[]> = {}
    
    graphData!.links.forEach(link => {
      if (!children[link.source]) children[link.source] = []
      if (!parents[link.target]) parents[link.target] = []
      children[link.source].push(link.target)
      parents[link.target].push(link.source)
    })
    
    // 2) Initialize zone storage
    const persistentRef = persistentNodePositions.current as any
    if (!persistentRef.zones) {
      persistentRef.zones = {}
    }
    const zones = persistentRef.zones
    
    // 3) Calculate required zone widths recursively (bottom-up)
    const calculateRequiredWidth = (topicId: string, level: number): number => {
      const baseWidth = 150 // Minimum width for the topic itself
      
      // Check if this topic has expanded children
      const effectsKey = `${topicId}-effects`
      const prerequisitesKey = `${topicId}-prerequisites`
      let childrenWidth = 0
      
      if (expandedTopics.has(effectsKey) && level >= 0) {
        const nodeChildren = children[topicId] || []
        if (nodeChildren.length > 0) {
          // Calculate total width needed for all children
          const childWidths = nodeChildren.map(childId => 
            calculateRequiredWidth(childId, level + 1)
          )
          childrenWidth = childWidths.reduce((sum, w) => sum + w, 0) + ((nodeChildren.length - 1) * 20) // Add spacing
        }
      }
      
      if (expandedTopics.has(prerequisitesKey) && level <= 0) {
        const nodeParents = parents[topicId] || []
        if (nodeParents.length > 0) {
          const parentWidths = nodeParents.map(parentId => 
            calculateRequiredWidth(parentId, level - 1)
          )
          childrenWidth = Math.max(childrenWidth, parentWidths.reduce((sum, w) => sum + w, 0) + ((nodeParents.length - 1) * 20))
        }
      }
      
      const requiredWidth = Math.max(baseWidth, childrenWidth)
      console.log(`📏 Topic ${topicId} at level ${level}: baseWidth=${baseWidth}, childrenWidth=${childrenWidth}, requiredWidth=${requiredWidth}`)
      return requiredWidth
    }
    
    // 4) Process levels from center outward, expanding zones as needed
    const allLevels = Array.from(new Set(nodes.map(n => n.level))).sort((a, b) => Math.abs(a) - Math.abs(b))
    console.log('🏗️ Processing levels in order:', allLevels)
    
    allLevels.forEach(level => {
      const nodesAtLevel = nodes.filter(n => n.level === level)
      if (!nodesAtLevel || nodesAtLevel.length === 0) return
      
      console.log(`🏗️ Level ${level}: Processing ${nodesAtLevel.length} nodes`)
      
      if (level === 0) {
        // Center level - calculate and create appropriately sized zone
        const centerNode = nodesAtLevel[0]
        const centerX = width / 2
        const centerY = height / 2
        
        // Calculate required width based on expanded children
        const requiredWidth = calculateRequiredWidth(centerNode.id, 0)
        const zoneWidth = Math.min(requiredWidth, width * 0.8) // Don't exceed 80% of total width
        
        // Position center node
        centerNode.x = centerX
        centerNode.y = centerY
        centerNode.fx = centerNode.x
        centerNode.fy = centerNode.y
        persistentNodePositions.current[centerNode.id] = { x: centerNode.x, y: centerNode.y }
        
        // Create/update center zone with proper width
        zones[`${centerNode.id}-0`] = {
          topicId: centerNode.id,
          centerX: centerX,
          width: zoneWidth,
          level: 0,
          order: 0
        }
        
        console.log(`🎯 Center node ${centerNode.name} positioned at (${centerX}, ${centerY}) with EXPANDED zone width=${zoneWidth} (required: ${requiredWidth})`)
        
      } else {
        // Child levels - position within expanded parent zones
        nodesAtLevel.forEach((node, nodeIndex) => {
          const levelY = (height / 2) + (level * 150)
          
          // Find this node's parent and ensure parent zone is expanded
          let parentZone = null
          let parentNode = null
          let parentId = null
          
          if (level > 0) {
            // Effects: find parent from prerequisites
            const nodeParents = parents[node.id] || []
            if (nodeParents.length > 0) {
              parentId = nodeParents[0]
              parentNode = nodes.find(n => n.id === parentId)
              if (parentNode) {
                // Expand parent zone if needed
                const requiredParentWidth = calculateRequiredWidth(parentId, parentNode.level)
                const currentParentZone = zones[`${parentId}-${parentNode.level}`]
                if (currentParentZone) {
                  // Update parent zone width to accommodate children
                  zones[`${parentId}-${parentNode.level}`] = {
                    ...currentParentZone,
                    width: Math.min(requiredParentWidth, width * 0.8)
                  }
                  parentZone = zones[`${parentId}-${parentNode.level}`]
                  console.log(`📈 Expanded parent zone for ${parentId}: width ${currentParentZone.width} → ${parentZone.width}`)
                }
              }
            }
          } else {
            // Prerequisites: find parent from dependents
            const nodeChildren = children[node.id] || []
            if (nodeChildren.length > 0) {
              parentId = nodeChildren[0]
              parentNode = nodes.find(n => n.id === parentId)
              if (parentNode) {
                // Similar expansion logic for prerequisites
                const requiredParentWidth = calculateRequiredWidth(parentId, parentNode.level)
                const currentParentZone = zones[`${parentId}-${parentNode.level}`]
                if (currentParentZone) {
                  zones[`${parentId}-${parentNode.level}`] = {
                    ...currentParentZone,
                    width: Math.min(requiredParentWidth, width * 0.8)
                  }
                  parentZone = zones[`${parentId}-${parentNode.level}`]
                  console.log(`📈 Expanded parent zone for ${parentId}: width ${currentParentZone.width} → ${parentZone.width}`)
                }
              }
            }
          }
          
          if (parentZone) {
            // Find all siblings (children of the same parent)
            const siblingsAtLevel = nodesAtLevel.filter(sibling => {
              const siblingParents = parents[sibling.id] || []
              const siblingChildren = children[sibling.id] || []
              const siblingParentId = level > 0 ? siblingParents[0] : siblingChildren[0]
              return siblingParentId === parentId
            })
            
            const siblingIndex = siblingsAtLevel.findIndex(s => s.id === node.id)
            const totalSiblings = siblingsAtLevel.length
            
            // Calculate individual child zone width and position
            const childZoneWidth = calculateRequiredWidth(node.id, level)
            const totalChildrenWidth = siblingsAtLevel.reduce((sum, sibling) => 
              sum + calculateRequiredWidth(sibling.id, level), 0
            )
            
            let childZoneCenterX
            
            if (totalSiblings === 1) {
              // Single child - center it directly under parent
              childZoneCenterX = parentZone.centerX
              console.log(`🎯 Single child ${node.name} centered under parent at ${childZoneCenterX.toFixed(1)}`)
            } else {
              // Multiple children - distribute symmetrically around parent center
              const spacing = Math.max(10, (parentZone.width - totalChildrenWidth) / (totalSiblings + 1))
              
              // Calculate the starting position to center the whole group
              const totalGroupWidth = totalChildrenWidth + ((totalSiblings - 1) * spacing)
              const groupStartX = parentZone.centerX - (totalGroupWidth / 2)
              
              // Position siblings sequentially from the centered start
              let currentX = groupStartX
              for (let i = 0; i < siblingIndex; i++) {
                currentX += calculateRequiredWidth(siblingsAtLevel[i].id, level) + spacing
              }
              
              childZoneCenterX = currentX + childZoneWidth / 2
              console.log(`🎯 Child ${siblingIndex + 1}/${totalSiblings} ${node.name} positioned at ${childZoneCenterX.toFixed(1)} (group centered under parent)`)
            }
            
            // Position the node
            node.x = childZoneCenterX
            node.y = levelY
            node.fx = node.x
            node.fy = node.y
            persistentNodePositions.current[node.id] = { x: node.x, y: node.y }
            
            // Create child zone
            zones[`${node.id}-${level}`] = {
              topicId: node.id,
              centerX: childZoneCenterX,
              width: childZoneWidth,
              level: level,
              order: siblingIndex
            }
            
            console.log(`👶 Child ${node.name} positioned at (${childZoneCenterX.toFixed(1)}, ${levelY}) within expanded parent zone, childZone width=${childZoneWidth.toFixed(1)}`)
            
          } else {
            // No parent zone - independent positioning
            const spacing = Math.min(200, (width - 100) / nodesAtLevel.length)
            const startX = (width - ((nodesAtLevel.length - 1) * spacing)) / 2
            const nodeX = startX + (nodeIndex * spacing)
            
            node.x = nodeX
            node.y = levelY
            node.fx = node.x
            node.fy = node.y
            persistentNodePositions.current[node.id] = { x: node.x, y: node.y }
            
            zones[`${node.id}-${level}`] = {
              topicId: node.id,
              centerX: nodeX,
              width: 150,
              level: level,
              order: nodeIndex
            }
            
            console.log(`🔄 Node ${node.name} positioned independently at (${nodeX.toFixed(1)}, ${levelY})`)
          }
        })
      }
    })
    
    console.log('🏗️ Zone expansion layout complete')
  }

  // D3 visualization effect
  useEffect(() => {
    console.log('Main useEffect triggered - isClientMounted:', isClientMounted, 'svgRef:', !!svgRef.current, 'graphData:', !!graphData, 'loading:', loading)
    if (!isClientMounted || !svgRef.current || !graphData || loading) return

    console.log('Creating graph visualization...')
    const nodes = prepareGraphNodes()
    console.log('Prepared nodes:', nodes.length, 'nodes with levels:', nodes.map(n => `${n.name}(${n.level})`))
    console.log('🚨 ABOUT TO CALL layoutNodes with nodes:', nodes.length)
    layoutNodes(nodes)
    console.log('🚨 layoutNodes call COMPLETED')

    const svg = d3.select(svgRef.current)
    
    // Preserve existing zoom/pan state
    let currentTransform = null
    const existingContainer = svg.select('g.main-container')
    if (!existingContainer.empty()) {
      currentTransform = d3.zoomTransform(svg.node() as SVGSVGElement)
    }
    
    // Clear previous graph
    svg.selectAll('*').remove()
    
    const container = svg.append('g').attr('class', 'main-container')

    // Zone boundaries removed - no longer needed for debugging

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform.toString())
      })

    svg.call(zoom)
    
    // Restore previous zoom/pan state if it existed
    if (currentTransform) {
      svg.call(zoom.transform, currentTransform)
      console.log('🔄 Preserved zoom/pan state:', currentTransform)
    }

    // Create arrowhead markers
    const defs = svg.append('defs')
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4L2,0Z')
      .style('fill', '#6B7280')

    // Create links
    const linkElements = container.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(graphData.links)
      .enter().append('path')
      .attr('class', 'link')
      .style('stroke', '#6B7280')
      .style('stroke-opacity', 0.8)
      .style('stroke-width', 2)
      .style('fill', 'none')
      .attr('marker-end', 'url(#arrow)')

    // Create curved paths with edge connections (like global graph)
    const createOptimizedPath = (sourceNode: GraphNode, targetNode: GraphNode) => {
      if (!sourceNode.x || !sourceNode.y || !targetNode.x || !targetNode.y) return ''
      
      // Calculate node dimensions (reuse from global graph)
      const calculateDims = (node: GraphNode) => {
        const maxCharsPerLine = 14
        const words = getLocalizedText(node.name, language).split(' ')
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
        const width = Math.max(maxLineLength * 7 + 16, 80)
        const height = Math.max(textLines.length * 14 + 16, 40)
        
        return { width, height }
      }
      
      const sourceDims = calculateDims(sourceNode)
      const targetDims = calculateDims(targetNode)
      
      // Calculate connection points - bottom midpoint of source, top midpoint of target
      const sourceX = sourceNode.x  // X center of source
      const sourceY = sourceNode.y + sourceDims.height / 2 // Bottom edge of source
      const targetX = targetNode.x  // X center of target  
      const targetY = targetNode.y - targetDims.height / 2 // Top edge of target
      
      // Create curved path that moves vertically near start and end
      const verticalDistance = Math.abs(targetY - sourceY)
      const horizontalDistance = Math.abs(targetX - sourceX)
      
      // Control point offset - more vertical movement near endpoints
      const controlOffset = Math.min(verticalDistance * 0.4, 80)
      
      // Control points for bezier curve
      const sourceControlX = sourceX
      const sourceControlY = sourceY + controlOffset // Move down from source
      const targetControlX = targetX  
      const targetControlY = targetY - controlOffset // Move up to target
      
      // Cubic bezier curve for smooth convex shape
      return `M ${sourceX},${sourceY} C ${sourceControlX},${sourceControlY} ${targetControlX},${targetControlY} ${targetX},${targetY}`
    }
    
    linkElements.attr('d', linkData => {
      const sourceNode = nodes.find(n => n.id === linkData.source)
      const targetNode = nodes.find(n => n.id === linkData.target)
      
      if (!sourceNode || !targetNode) return ''
      
      return createOptimizedPath(sourceNode, targetNode)
    })

    // Create or update node groups using proper D3 update pattern
    const nodesContainer = container.selectAll('g.nodes').data([null])
    const nodesGroup = nodesContainer.enter()
      .append('g')
      .attr('class', 'nodes')
      .merge(nodesContainer)

    const nodeGroups = nodesGroup
      .selectAll('g.node-group')
      .data(nodes, (d: any) => d.id)

    // Remove old nodes
    nodeGroups.exit().remove()

    // Create new nodes  
    const newNodeGroups = nodeGroups.enter()
      .append('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')

    // Update all nodes (both existing and new) with proper positions
    const allNodeGroups = newNodeGroups.merge(nodeGroups)
      .attr('transform', d => `translate(${d.x}, ${d.y})`)

    // Add rectangular nodes only to new groups
    newNodeGroups.append('rect')
      .attr('class', 'node')
      .attr('width', d => calculateNodeDimensions(getLocalizedText(d.name)).width)
      .attr('height', d => calculateNodeDimensions(getLocalizedText(d.name)).height)
      .attr('x', d => -calculateNodeDimensions(getLocalizedText(d.name)).width / 2)
      .attr('y', d => -calculateNodeDimensions(getLocalizedText(d.name)).height / 2)
      .attr('rx', 8)
      .style('fill', d => getNodeColor(d, d.id === selectedTopic?.id))
      .style('stroke', d => getStatusBorderColor(d.status || 'NOT_LEARNED'))
      .style('stroke-width', 4)
      .style('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))')

    // Update existing node styles (for selection/status changes)
    allNodeGroups.selectAll('rect.node')
      .style('fill', d => getNodeColor(d, d.id === selectedTopic?.id))
      .style('stroke', d => getStatusBorderColor(d.status || 'NOT_LEARNED'))

    // Add topic icons and text only to new nodes
    const labelGroups = newNodeGroups.append('g')
      .attr('class', 'node-labels')
      .style('pointer-events', 'none')
      
    labelGroups.each(function(nodeData) {
      const textDimensions = calculateNodeDimensions(getLocalizedText(nodeData.name))
      const labelGroup = d3.select(this)
      
      // Topic type icon
      const topicIcon = nodeData.type === 'THEORY' ? '📚' : 
                       nodeData.type === 'PRACTICE' ? '⚙️' : 
                       nodeData.type === 'PROJECT' ? '🚀' : '❓'
      
      const allLines = [topicIcon, ...textDimensions.lines]
      
      allLines.forEach((line, lineIndex) => {
        labelGroup.append('text')
          .attr('dy', (lineIndex - (allLines.length - 1) / 2) * 14)
          .attr('text-anchor', 'middle')
          .style('font-size', lineIndex === 0 ? '16px' : '11px')
          .style('font-weight', lineIndex === 0 ? 'normal' : 'bold')
          .style('fill', 'white')
          .text(line)
      })
    })

    // Add expansion badges (only allow expanding in the correct direction for tree structure)
    // Only add badges to new nodes to avoid duplicates
    newNodeGroups.each(function(nodeData) {
      const group = d3.select(this)
      const nodeDims = calculateNodeDimensions(getLocalizedText(nodeData.name))
      
      // Determine which badges to show based on topic position in tree
      const isCenterTopic = nodeData.id === centerTopicId
      const isPrerequisiteTopic = nodeData.level < 0 // Any negative level (prerequisites)
      const isEffectTopic = nodeData.level > 0 // Any positive level (effects)
      
      // Prerequisites badge (top) - only for center topic and prerequisite topics
      if (nodeData.prerequisiteCount > 0 && (isCenterTopic || isPrerequisiteTopic)) {
        const expansionKey = `${nodeData.id}-prerequisites`
        const isExpanded = expandedTopics.has(expansionKey)
        
        const badgeGroup = group.append('g')
          .attr('class', 'prerequisite-badge')
          .style('cursor', 'pointer')
          .on('click', (event) => {
            event.stopPropagation()
            handleExpansion(nodeData.id, 'prerequisites')
          })
        
        // Badge circle positioned at top center of node
        badgeGroup.append('circle')
          .attr('cx', 0)
          .attr('cy', -nodeDims.height / 2)
          .attr('r', 12)
          .style('fill', '#3B82F6')
          .style('stroke', 'white')
          .style('stroke-width', 2)
        
        // Badge text
        badgeGroup.append('text')
          .attr('x', 0)
          .attr('y', -nodeDims.height / 2)
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .style('fill', 'white')
          .style('font-size', '10px')
          .style('font-weight', 'bold')
          .text(isExpanded ? '-' : `↑${nodeData.prerequisiteCount}`)
      }
      
      // Effects badge (bottom) - only for center topic and effect topics
      if (nodeData.effectCount > 0 && (isCenterTopic || isEffectTopic)) {
        const expansionKey = `${nodeData.id}-effects`
        const isExpanded = expandedTopics.has(expansionKey)
        
        const badgeGroup = group.append('g')
          .attr('class', 'effects-badge')
          .style('cursor', 'pointer')
          .on('click', (event) => {
            event.stopPropagation()
            handleExpansion(nodeData.id, 'effects')
          })
        
        // Badge circle positioned at bottom center of node
        badgeGroup.append('circle')
          .attr('cx', 0)
          .attr('cy', nodeDims.height / 2)
          .attr('r', 12)
          .style('fill', '#10B981')
          .style('stroke', 'white')
          .style('stroke-width', 2)
        
        // Badge text
        badgeGroup.append('text')
          .attr('x', 0)
          .attr('y', nodeDims.height / 2)
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .style('fill', 'white')
          .style('font-size', '10px')
          .style('font-weight', 'bold')
          .text(isExpanded ? '-' : `↓${nodeData.effectCount}`)
      }
    })

    // Update badge text for existing nodes when expansion state changes
    allNodeGroups.each(function(nodeData) {
      const group = d3.select(this)
      
      // Update prerequisites badge text
      const prerequisiteBadge = group.select('.prerequisite-badge text')
      if (!prerequisiteBadge.empty() && nodeData.prerequisiteCount > 0) {
        const expansionKey = `${nodeData.id}-prerequisites`
        const isExpanded = expandedTopics.has(expansionKey)
        prerequisiteBadge.text(isExpanded ? '-' : `↑${nodeData.prerequisiteCount}`)
      }
      
      // Update effects badge text
      const effectsBadge = group.select('.effects-badge text')
      if (!effectsBadge.empty() && nodeData.effectCount > 0) {
        const expansionKey = `${nodeData.id}-effects`
        const isExpanded = expandedTopics.has(expansionKey)
        effectsBadge.text(isExpanded ? '-' : `↓${nodeData.effectCount}`)
      }
    })

    // Add interactions with proper click/double-click handling
    let clickTimeout: NodeJS.Timeout | null = null
    
    allNodeGroups
      .on('click', (event, nodeData) => {
        // Delay single click to allow for double-click detection
        if (clickTimeout) {
          clearTimeout(clickTimeout)
          clickTimeout = null
        }
        
        clickTimeout = setTimeout(() => {
          setSelectedTopic(nodeData)
          onTopicSelect?.(nodeData)
          clickTimeout = null
        }, 250) // 250ms delay to detect double-click
      })
      .on('dblclick', (event, nodeData) => {
        event.preventDefault()
        event.stopPropagation()
        
        // Cancel single click if double-click occurs
        if (clickTimeout) {
          clearTimeout(clickTimeout)
          clickTimeout = null
        }
        
        console.log('Double-click detected on:', nodeData.name, 'ID:', nodeData.id)
        handleDoubleClick(nodeData)
      })

  }, [isClientMounted, graphData, expandedTopics, selectedTopic, language, loading])

  // Fetch data when center topic changes
  useEffect(() => {
    fetchLocalGraphData()
  }, [fetchLocalGraphData])

  if (!isClientMounted || loading) {
    return (
      <div className="relative">
        <div 
          style={{ width, height }}
          className="bg-gradient-to-br from-gray-50 to-indigo-50 rounded-lg shadow-lg border border-gray-200 flex items-center justify-center"
        >
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Loading local graph...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!graphData) {
    return (
      <div className="relative">
        <div 
          style={{ width, height }}
          className="bg-gradient-to-br from-gray-50 to-indigo-50 rounded-lg shadow-lg border border-gray-200 flex items-center justify-center"
        >
          <div className="text-center">
            <div className="text-4xl mb-4">❌</div>
            <p className="text-gray-600">Failed to load local graph data</p>
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
      
      {/* Instructions */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-md text-xs">
        <div className="space-y-1 text-gray-600">
          <div>📍 <strong>Double-click</strong> to recenter</div>
          <div>🔵 <strong>↑/↓ badges</strong> to expand/collapse</div>
          <div>🎯 <strong>Click</strong> to select topic</div>
        </div>
      </div>
    </div>
  )
}