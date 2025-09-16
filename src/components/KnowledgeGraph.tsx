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

    // Debug: Log incoming data
    console.log('🔧 KnowledgeGraph v2.1 (fixed edges) - received data:', {
      nodes: data.nodes.length,
      links: data.links.length,
      sampleLinks: data.links.slice(0, 3)
    })

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

    // Mathematical graph layout algorithm with planarity optimization
    const mathematicalGraphLayout = () => {
      // 1. Find connected components first (DIRECTED graph - follow edges in direction only)
      const findConnectedComponents = () => {
        const visited = new Set<string>()
        const components: string[][] = []
        
        const dfs = (nodeId: string, component: string[]) => {
          if (visited.has(nodeId)) return
          visited.add(nodeId)
          component.push(nodeId)
          
          // Follow edges in BOTH directions for connectivity (but respect direction for levels)
          data.links.forEach(link => {
            const sourceId = typeof link.source === 'string' ? link.source : link.source.id
            const targetId = typeof link.target === 'string' ? link.target : link.target.id
            
            // Follow outgoing edges (this node is source)
            if (sourceId === nodeId && !visited.has(targetId)) {
              dfs(targetId, component)
            }
            // Follow incoming edges (this node is target) 
            if (targetId === nodeId && !visited.has(sourceId)) {
              dfs(sourceId, component)
            }
          })
        }
        
        data.nodes.forEach(node => {
          if (!visited.has(node.id)) {
            const component: string[] = []
            dfs(node.id, component)
            components.push(component)
          }
        })
        
        return components
      }
      
      // 2. Calculate hierarchical levels (longest path from sources)
      const calculateNodeLevels = (componentNodes: string[]) => {
        const levels: Record<string, number> = {}
        
        const getLevel = (nodeId: string, visiting = new Set<string>()): number => {
          if (visiting.has(nodeId)) {
            console.warn(`Cycle detected at node ${nodeId}`);
            return 0; // Cycle detection
          }
          if (levels[nodeId] !== undefined) return levels[nodeId]
          
          visiting.add(nodeId)
          
          const prerequisites = data.links
            .filter(link => {
              const targetId = typeof link.target === 'string' ? link.target : link.target.id
              const sourceId = typeof link.source === 'string' ? link.source : link.source.id
              return targetId === nodeId && componentNodes.includes(sourceId)
            })
            .map(link => typeof link.source === 'string' ? link.source : link.source.id)
          
          if (prerequisites.length === 0) {
            levels[nodeId] = 0
          } else {
            const prereqLevels = prerequisites.map(prereqId => getLevel(prereqId, new Set(visiting)))
            levels[nodeId] = Math.max(...prereqLevels) + 1
          }
          
          visiting.delete(nodeId)
          return levels[nodeId]
        }
        
        componentNodes.forEach(nodeId => getLevel(nodeId))
        
        // DON'T modify the original data.links - this breaks the graph permanently
        // Instead, just warn about problematic edges but keep them for rendering
        data.links.forEach(link => {
          const sourceId = typeof link.source === 'string' ? link.source : link.source.id
          const targetId = typeof link.target === 'string' ? link.target : link.target.id
          
          if (componentNodes.includes(sourceId) && componentNodes.includes(targetId)) {
            const sourceLevel = levels[sourceId]
            const targetLevel = levels[targetId]
            
            // Only warn about potentially problematic edges, but keep them
            if (sourceLevel >= targetLevel) {
              console.warn(`Potential cycle/horizontal edge: ${data.nodes.find(n => n.id === sourceId)?.name} → ${data.nodes.find(n => n.id === targetId)?.name} (levels: ${sourceLevel} → ${targetLevel})`)
            }
          }
        })
        
        // Debug: Show level distribution
        const levelCounts: Record<number, number> = {}
        Object.values(levels).forEach(level => {
          levelCounts[level] = (levelCounts[level] || 0) + 1
        })
        console.log('Level distribution:', levelCounts)
        
        // Debug: Show top-level topics specifically
        const maxLevel = Math.max(...Object.values(levels))
        const topLevelNodes = Object.entries(levels)
          .filter(([_, level]) => level >= maxLevel - 2) // Top 3 levels
          .map(([nodeId, level]) => {
            const node = data.nodes.find(n => n.id === nodeId)
            return `Level ${level}: ${node?.name}`
          })
        console.log('Top-level topics:', topLevelNodes)
        
        return levels
      }
      
      // 3. Apply planarity-aware positioning within each level
      const positionComponent = (componentNodes: string[], componentIndex: number, totalComponents: number) => {
        const levels = calculateNodeLevels(componentNodes)
        const maxLevel = Math.max(...Object.values(levels))
        
        // Separate components horizontally to avoid intersections
        const componentWidth = Math.max(1200, width * 0.8) // Back to original width
        const componentSpacing = componentWidth + 300 // Back to original spacing
        const componentStartX = componentIndex * componentSpacing + 100
        
        // Group nodes by level
        const nodesByLevel: Record<number, string[]> = {}
        componentNodes.forEach(nodeId => {
          const level = levels[nodeId]
          if (!nodesByLevel[level]) nodesByLevel[level] = []
          nodesByLevel[level].push(nodeId)
        })
        
        // Position each level with planarity consideration
        Object.keys(nodesByLevel).forEach(levelStr => {
          const level = parseInt(levelStr)
          const nodesInLevel = nodesByLevel[level]
          
          // Calculate positions to minimize edge crossings using barycentric method
          const sortNodesForPlanarity = (nodes: string[]) => {
            if (level === 0) return nodes // Root level - arbitrary order
            
            // For each node, calculate the average X position of its prerequisites
            const nodeWeights: Record<string, number> = {}
            
            nodes.forEach(nodeId => {
              const prerequisites = data.links
                .filter(link => {
                  const targetId = typeof link.target === 'string' ? link.target : link.target.id
                  return targetId === nodeId
                })
                .map(link => typeof link.source === 'string' ? link.source : link.source.id)
              
              if (prerequisites.length > 0) {
                const avgX = prerequisites.reduce((sum, prereqId) => {
                  const prereqNode = data.nodes.find(n => n.id === prereqId)
                  return sum + (prereqNode?.fx || 0)
                }, 0) / prerequisites.length
                nodeWeights[nodeId] = avgX
              } else {
                nodeWeights[nodeId] = 0
              }
            })
            
            return nodes.sort((a, b) => nodeWeights[a] - nodeWeights[b])
          }
          
          const sortedNodes = sortNodesForPlanarity(nodesInLevel)
          const minNodeSpacing = 150 // Minimum 150px between node centers
          const levelSpacing = Math.max(minNodeSpacing, componentWidth / (sortedNodes.length + 1))
          const levelY = height - 100 - (level * 120) // Back to original vertical spacing
          
          sortedNodes.forEach((nodeId, index) => {
            const node = data.nodes.find(n => n.id === nodeId)
            if (node) {
              node.fx = componentStartX + levelSpacing * (index + 1)
              // REMOVE Y CONSTRAINT for top levels to allow proper separation
              if (level >= maxLevel - 3) {
                // For top levels, allow Y to go beyond normal bounds
                node.fy = levelY
              } else {
                node.fy = Math.max(50, Math.min(height - 50, levelY))
              }
            }
          })
        })
        
        // Helper function to calculate node dimensions
        const getNodeDimensions = (topicName: string) => {
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
          
          return { width: nodeWidth, height: nodeHeight }
        }
        
        // Helper function to check if two rectangles intersect
        const rectanglesIntersect = (node1: GraphNode, node2: GraphNode) => {
          if (!node1.fx || !node1.fy || !node2.fx || !node2.fy) return false
          
          const dims1 = getNodeDimensions(node1.name)
          const dims2 = getNodeDimensions(node2.name)
          
          // Rectangle 1 bounds
          const left1 = node1.fx - dims1.width / 2
          const right1 = node1.fx + dims1.width / 2
          const top1 = node1.fy - dims1.height / 2
          const bottom1 = node1.fy + dims1.height / 2
          
          // Rectangle 2 bounds
          const left2 = node2.fx - dims2.width / 2
          const right2 = node2.fx + dims2.width / 2
          const top2 = node2.fy - dims2.height / 2
          const bottom2 = node2.fy + dims2.height / 2
          
          // Check for intersection
          return !(right1 <= left2 || left1 >= right2 || bottom1 <= top2 || top1 >= bottom2)
        }
        
        // Helper function to check if any nodes intersect with the given nodes
        const hasIntersections = (nodesToCheck: string[]) => {
          // Check within the level
          for (let i = 0; i < nodesToCheck.length; i++) {
            const node1 = data.nodes.find(n => n.id === nodesToCheck[i])
            if (!node1) continue
            
            for (let j = i + 1; j < nodesToCheck.length; j++) {
              const node2 = data.nodes.find(n => n.id === nodesToCheck[j])
              if (!node2) continue
              
              if (rectanglesIntersect(node1, node2)) {
                console.log(`Intersection detected between ${node1.name} and ${node2.name}`)
                return true
              }
            }
            
            // Check against ALL other nodes in the graph (not just same component)
            data.nodes.forEach(otherNode => {
              if (nodesToCheck.includes(otherNode.id)) return // Skip nodes in current level
              if (!otherNode.fx || !otherNode.fy) return // Skip unpositioned nodes
              
              if (rectanglesIntersect(node1, otherNode)) {
                console.log(`Intersection detected between ${node1.name} and ${otherNode.name}`)
                return true
              }
            })
          }
          return false
        }
        
        // Constrained optimization to minimize edge length while preserving spacing  
        const optimizeWithConstraints = (componentNodes: string[], compStartX: number, compWidth: number, iterations = 3) => {
          for (let iter = 0; iter < iterations; iter++) {
            let improved = false
            
            // For each level, try to optimize node order
            Object.keys(nodesByLevel).forEach(levelStr => {
              const level = parseInt(levelStr)
              const nodesInLevel = nodesByLevel[level]
              
              if (nodesInLevel.length <= 1) {
                return // Can't optimize single node
              }
              
              // Calculate spacing for this level - ensure enough for largest nodes
              const maxNodeWidth = Math.max(...nodesInLevel.map(nodeId => {
                const node = data.nodes.find(n => n.id === nodeId)
                return node ? getNodeDimensions(node.name).width : 80
              }))
              const minNodeSpacing = Math.max(150, maxNodeWidth + 20) // Back to original spacing
              const currentLevelSpacing = Math.max(minNodeSpacing, compWidth / (nodesInLevel.length + 1))
              
              // Calculate connection clustering score (higher = better clustering)
              const calculateClusteringScore = (nodeOrder: string[]) => {
                let totalScore = 0
                
                // For each pair of nodes in this level
                for (let i = 0; i < nodeOrder.length; i++) {
                  for (let j = i + 1; j < nodeOrder.length; j++) {
                    const node1Id = nodeOrder[i]
                    const node2Id = nodeOrder[j]
                    
                    // Count connections between these two nodes
                    const connectionCount = data.links.filter(link => {
                      const sourceId = typeof link.source === 'string' ? link.source : link.source.id
                      const targetId = typeof link.target === 'string' ? link.target : link.target.id
                      
                      return (sourceId === node1Id && targetId === node2Id) ||
                             (sourceId === node2Id && targetId === node1Id)
                    }).length
                    
                    if (connectionCount > 0) {
                      // Calculate distance penalty (closer = better score)
                      const distance = Math.abs(i - j) // Position distance in the ordering
                      const proximityBonus = connectionCount * (nodeOrder.length - distance)
                      totalScore += proximityBonus
                    }
                  }
                }
                
                return totalScore
              }
              
              // Go back to simple horizontal distance for debugging
              const calculateHorizontalDistance = (nodeOrder: string[]) => {
                let totalDistance = 0
                nodeOrder.forEach(nodeId => {
                  const node = data.nodes.find(n => n.id === nodeId)
                  if (!node || !node.fx) return
                  
                  data.links.forEach(link => {
                    const sourceId = typeof link.source === 'string' ? link.source : link.source.id
                    const targetId = typeof link.target === 'string' ? link.target : link.target.id
                    
                    if (sourceId === nodeId || targetId === nodeId) {
                      const otherNodeId = sourceId === nodeId ? targetId : sourceId
                      const otherNode = data.nodes.find(n => n.id === otherNodeId)
                      
                      if (otherNode && otherNode.fx && node.fx) {
                        const horizontalDistance = Math.abs(otherNode.fx - node.fx)
                        totalDistance += horizontalDistance
                        // Edge distance calculated
                      }
                    }
                  })
                })
                return totalDistance
              }
              
              const currentDistance = calculateHorizontalDistance(nodesInLevel)
              
              // Try swapping adjacent pairs only (preserves spacing constraints)
              for (let i = 0; i < nodesInLevel.length - 1; i++) {
                // Create new ordering with adjacent swap
                const newOrder = [...nodesInLevel]
                const temp = newOrder[i]
                newOrder[i] = newOrder[i + 1]
                newOrder[i + 1] = temp
                
                // Temporarily update positions with proper spacing
                const tempPositions: { nodeId: string, oldX: number }[] = []
                const currentLevelSpacing = Math.max(150, compWidth / (newOrder.length + 1))
                
                newOrder.forEach((nodeId, index) => {
                  const node = data.nodes.find(n => n.id === nodeId)
                  if (node && node.fx) {
                    tempPositions.push({ nodeId, oldX: node.fx })
                    node.fx = compStartX + currentLevelSpacing * (index + 1)
                  }
                })
                
                // Check for intersections with new positions
                const hasCollisions = hasIntersections(newOrder)
                const newDistance = calculateHorizontalDistance(newOrder)
                
                if (!hasCollisions && newDistance < currentDistance) {
                  // Keep the new ordering - it reduced horizontal distance without collisions
                  improved = true
                  nodesByLevel[level] = newOrder
                  break // Move to next level after one improvement
                } else {
                  // Revert positions (either has collisions or no improvement)
                  tempPositions.forEach(({ nodeId, oldX }) => {
                    const node = data.nodes.find(n => n.id === nodeId)
                    if (node) node.fx = oldX
                  })
                }
              }
            })
            
            // If no improvement was made in this iteration, stop early
            if (!improved) break
          }
        }
        
        optimizeWithConstraints(componentNodes, componentStartX, componentWidth)
        
        return { levels, maxLevel }
      }
      
      // 4. Layout all components
      const components = findConnectedComponents()
      let globalLevels: Record<string, number> = {}
      let globalMaxLevel = 0
      
      components.forEach((component, index) => {
        const { levels, maxLevel } = positionComponent(component, index, components.length)
        globalLevels = { ...globalLevels, ...levels }
        globalMaxLevel = Math.max(globalMaxLevel, maxLevel)
      })
      
      return { nodeLevels: globalLevels, maxLevel: globalMaxLevel, componentCount: components.length }
    }
    
    const { nodeLevels, maxLevel, componentCount } = mathematicalGraphLayout()
    
    // Debug: Check if links survived the layout algorithm
    console.log('After mathematical layout:', {
      linksRemaining: data.links.length,
      sampleLinksAfterLayout: data.links.slice(0, 3)
    })
    
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
      // No clustering forces - nodes have fixed positions
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

    // Simple straight line paths
    const createStraightPath = (sourceNode: GraphNode, targetNode: GraphNode) => {
      if (!sourceNode.x || !sourceNode.y || !targetNode.x || !targetNode.y) return ''
      return `M ${sourceNode.x},${sourceNode.y} L ${targetNode.x},${targetNode.y}`
    }

    // Debug: Log links being rendered
    console.log('🚀 About to render links:', data.links.length, 'links')
    console.log('🚀 Sample links:', data.links.slice(0, 3))
    
    // Create enhanced links with bundling
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
      .attr('refX', 27) // Slightly further back to account for thicker line
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .style('fill', '#94A3B8')

    linkElements.attr('marker-end', 'url(#arrow)')
      .attr('d', linkData => {
        const sourceNode = typeof linkData.source === 'object' ? linkData.source : data.nodes.find(node => node.id === linkData.source)
        const targetNode = typeof linkData.target === 'object' ? linkData.target : data.nodes.find(node => node.id === linkData.target)
        
        if (!sourceNode || !targetNode) return ''
        
        return createStraightPath(sourceNode, targetNode)
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

      
    // No cluster labels - clean mathematical layout

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
        ).attr('marker-end', linkData => 
          (typeof linkData.source === 'object' && linkData.source.id === nodeData.id) ||
          (typeof linkData.target === 'object' && linkData.target.id === nodeData.id) ? 'url(#arrow-highlighted)' : 'url(#arrow)'
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
          .attr('marker-end', 'url(#arrow)')
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
        
        return createStraightPath(sourceNode, targetNode)
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