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
  selected?: boolean
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
  onNodeDoubleClick?: (node: GraphNode) => void
  selectedNodeId?: string
  onNodeSelect?: (node: GraphNode | null) => void
  centerOnNodeId?: string
}

export default function KnowledgeGraph({ 
  data, 
  width = 800, 
  height = 600, 
  onNodeClick,
  onNodeDoubleClick,
  selectedNodeId,
  onNodeSelect,
  centerOnNodeId
}: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [isClientMounted, setIsClientMounted] = useState(false)
  // Persistent transform state that survives re-renders
  const persistentTransform = useRef(d3.zoomIdentity)

  useEffect(() => {
    setIsClientMounted(true)
  }, [])

  // Node colors based on selection, hover, and highlighting
  const getNodeColor = (nodeData: GraphNode, isSelected: boolean, isHovered: boolean) => {
    // Priority: selection for creation > normal selection > hover > highlighting
    if (nodeData.selected) return '#10B981'  // Green when selected for creation
    if (isSelected) return '#1F2937'  // Dark gray when selected
    if (isHovered) return '#374151'   // Medium gray when hovered
    
    // Use highlighting to make non-highlighted nodes more transparent
    if (nodeData.highlighted === false) {
      return '#9CA3AF'  // Lighter gray for non-highlighted nodes
    }
    
    return '#6B7280'  // Normal gray for highlighted or all nodes
  }

  useEffect(() => {
    if (!isClientMounted || !svgRef.current || !data.nodes.length) return

    // Initialize knowledge graph rendering
    console.log('🔍 KnowledgeGraph: Starting edge detection audit...')

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove()

    const svgElement = d3.select(svgRef.current)
    const graphContainer = svgElement.append('g')

    // Add zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        // Update both local and persistent transform state
        persistentTransform.current = event.transform
        graphContainer.attr('transform', event.transform.toString())
      })

    svgElement.call(zoomBehavior)
    
    // Apply current persistent transform state initially
    svgElement.call(zoomBehavior.transform, persistentTransform.current)
    graphContainer.attr('transform', persistentTransform.current.toString())

    // Direct grid-based layout following user instructions
    const gridBasedLayout = () => {
      console.log('🔧 Starting direct grid-based layout...')
      
      // Step 1: Count "level" of each topic (number of prerequisite levels)
      const calculateLevels = () => {
        const levels: Record<string, number> = {}
        const calculated = new Set<string>()
        
        const calculateLevel = (nodeId: string, visiting = new Set<string>()): number => {
          // Avoid infinite cycles
          if (visiting.has(nodeId)) {
            console.warn(`Cycle detected at ${nodeId}, returning level 0`)
            return 0
          }
          
          // Return cached result
          if (levels[nodeId] !== undefined) {
            return levels[nodeId]
          }
          
          visiting.add(nodeId)
          
          // Find all prerequisites (incoming edges)
          const prerequisites = data.links
            .filter(link => {
              const targetId = typeof link.target === 'string' ? link.target : link.target.id
              return targetId === nodeId
            })
            .map(link => typeof link.source === 'string' ? link.source : link.source.id)
          
          if (prerequisites.length === 0) {
            // No prerequisites = level 0
            levels[nodeId] = 0
          } else {
            // Level = max level of prerequisites + 1
            const prereqLevels = prerequisites.map(prereqId => 
              calculateLevel(prereqId, new Set(visiting))
            )
            levels[nodeId] = Math.max(...prereqLevels) + 1
          }
          
          visiting.delete(nodeId)
          calculated.add(nodeId)
          return levels[nodeId]
        }
        
        // Calculate level for each node
        data.nodes.forEach(node => {
          if (!calculated.has(node.id)) {
            calculateLevel(node.id)
          }
        })
        
        return levels
      }
      
      // Step 2: Create grid coordinates wide enough for rectangles
      const createGrid = (levels: Record<string, number>) => {
        // Grid parameters - wide enough to avoid overlaps
        const GRID_CELL_WIDTH = 220   // Width for each grid cell
        const GRID_CELL_HEIGHT = 200  // Height for each grid cell (doubled from 100)
        const MARGIN_X = 50
        const MARGIN_Y = 50
        
        // Group nodes by level
        const nodesByLevel: Record<number, string[]> = {}
        Object.entries(levels).forEach(([nodeId, level]) => {
          if (!nodesByLevel[level]) nodesByLevel[level] = []
          nodesByLevel[level].push(nodeId)
        })
        
        const maxLevel = Math.max(...Object.values(levels))
        const maxNodesInLevel = Math.max(...Object.values(nodesByLevel).map(nodes => nodes.length))
        
        console.log(`📊 Grid layout: ${maxLevel + 1} levels, max ${maxNodesInLevel} nodes per level`)
        
        return { nodesByLevel, maxLevel, GRID_CELL_WIDTH, GRID_CELL_HEIGHT, MARGIN_X, MARGIN_Y }
      }
      
      // Step 3: Place rectangles on grid by level with minimal edge length
      const positionOnGrid = (levels: Record<string, number>) => {
        const { nodesByLevel, maxLevel, GRID_CELL_WIDTH, GRID_CELL_HEIGHT, MARGIN_X, MARGIN_Y } = createGrid(levels)
        
        // Process levels from 0 to max
        for (let level = 0; level <= maxLevel; level++) {
          const nodesInLevel = nodesByLevel[level] || []
          if (nodesInLevel.length === 0) continue
          
          console.log(`📍 Positioning level ${level}: ${nodesInLevel.length} nodes`)
          
          // Calculate Y position for this level
          const y = MARGIN_Y + level * GRID_CELL_HEIGHT
          
          // Calculate total width needed for this level
          const levelWidth = nodesInLevel.length * GRID_CELL_WIDTH
          // Center the level within the available width
          const levelStartX = (width - levelWidth) / 2
          
          // For level 0, just space nodes evenly and centered
          if (level === 0) {
            nodesInLevel.forEach((nodeId, index) => {
              const node = data.nodes.find(n => n.id === nodeId)
              if (node) {
                const x = levelStartX + (index + 0.5) * GRID_CELL_WIDTH
                node.fx = x
                node.fy = y
                node.x = x
                node.y = y
                console.log(`   Level 0: ${node.name} at (${x}, ${y})`)
              }
            })
          } else {
            // For higher levels, optimize grid positioning to minimize edge length
            const nodePositions: Array<{nodeId: string, optimalGridIndex: number}> = []
            
            nodesInLevel.forEach(nodeId => {
              const node = data.nodes.find(n => n.id === nodeId)
              if (!node) return
              
              // Find prerequisites and their X positions
              const prerequisites = data.links
                .filter(link => {
                  const targetId = typeof link.target === 'string' ? link.target : link.target.id
                  return targetId === nodeId
                })
                .map(link => typeof link.source === 'string' ? link.source : link.source.id)
                .map(prereqId => data.nodes.find(n => n.id === prereqId))
                .filter(n => n && n.x !== undefined)
              
              let optimalX: number
              if (prerequisites.length > 0) {
                // Average X position of prerequisites
                optimalX = prerequisites.reduce((sum, prereq) => sum + (prereq!.x || 0), 0) / prerequisites.length
              } else {
                // No prerequisites, use center of graph
                optimalX = width / 2
              }
              
              // Convert optimal X to grid index (which grid cell is closest)
              const relativeX = optimalX - levelStartX
              const optimalGridIndex = Math.max(0, Math.min(
                nodesInLevel.length - 1,
                Math.round(relativeX / GRID_CELL_WIDTH - 0.5)
              ))
              
              nodePositions.push({ nodeId, optimalGridIndex })
            })
            
            // Create assignment array to track which grid positions are taken
            const gridAssignments: (string | null)[] = new Array(nodesInLevel.length).fill(null)
            const assignedNodes = new Set<string>()
            
            // Sort by optimal grid index for initial assignment preference
            const sortedPositions = [...nodePositions].sort((a, b) => a.optimalGridIndex - b.optimalGridIndex)
            
            // First pass: assign nodes to their optimal positions if available
            sortedPositions.forEach(({nodeId, optimalGridIndex}) => {
              if (gridAssignments[optimalGridIndex] === null) {
                gridAssignments[optimalGridIndex] = nodeId
                assignedNodes.add(nodeId)
              }
            })
            
            // Second pass: assign remaining nodes to closest available positions
            sortedPositions.forEach(({nodeId, optimalGridIndex}) => {
              if (assignedNodes.has(nodeId)) return
              
              // Find closest available position
              let bestIndex = -1
              let bestDistance = Infinity
              
              for (let i = 0; i < gridAssignments.length; i++) {
                if (gridAssignments[i] === null) {
                  const distance = Math.abs(i - optimalGridIndex)
                  if (distance < bestDistance) {
                    bestDistance = distance
                    bestIndex = i
                  }
                }
              }
              
              if (bestIndex !== -1) {
                gridAssignments[bestIndex] = nodeId
                assignedNodes.add(nodeId)
              }
            })
            
            // Assign actual positions based on grid assignments
            gridAssignments.forEach((nodeId, gridIndex) => {
              if (nodeId) {
                const node = data.nodes.find(n => n.id === nodeId)
                if (node) {
                  const x = levelStartX + (gridIndex + 0.5) * GRID_CELL_WIDTH
                  node.fx = x
                  node.fy = y
                  node.x = x
                  node.y = y
                  
                  const originalOptimal = nodePositions.find(p => p.nodeId === nodeId)?.optimalGridIndex
                  console.log(`   Level ${level}: ${node.name} at grid ${gridIndex} (${x}, ${y}) - optimal was ${originalOptimal}`)
                }
              }
            })
          }
        }
        
        return { levels, maxLevel, nodesByLevel }
      }
      
      const levels = calculateLevels()
      return positionOnGrid(levels)
    }
    
    // Old mathematical function - keeping for now but not used
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
        
        // Group nodes by level first
        const nodesByLevel: Record<number, string[]> = {}
        componentNodes.forEach(nodeId => {
          const level = levels[nodeId]
          if (!nodesByLevel[level]) nodesByLevel[level] = []
          nodesByLevel[level].push(nodeId)
        })
        
        // Separate components horizontally to avoid intersections with better spacing
        const maxNodesPerLevel = Math.max(...Object.values(nodesByLevel).map(arr => arr.length))
        const componentWidth = Math.max(1400, maxNodesPerLevel * 220) // Dynamic width based on max nodes per level
        const componentSpacing = componentWidth + 400 // Increased spacing between components
        const componentStartX = componentIndex * componentSpacing + 100
        
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
          const minNodeSpacing = 200 // Increased minimum spacing between node centers
          const levelSpacing = Math.max(minNodeSpacing, componentWidth / (sortedNodes.length + 1))
          const levelY = height - 100 - (level * 150) // Increased vertical spacing between levels
          
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
    
    const { levels: nodeLevels, maxLevel, nodesByLevel } = gridBasedLayout()
    
    // Filter out invalid links to prevent invisible arrows
    const validLinks = data.links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id
      const targetId = typeof link.target === 'string' ? link.target : link.target.id
      const sourceNode = data.nodes.find(n => n.id === sourceId)
      const targetNode = data.nodes.find(n => n.id === targetId)
      return sourceNode && targetNode
    })
    
    const filteredLinks = validLinks
    
    // Completely disable force simulation - nodes have fixed positions
    const forceSimulation = d3.forceSimulation<GraphNode>(data.nodes)
      .stop() // Stop the simulation immediately

    // getNodeColor is now defined outside the useEffect
    
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

    // Calculate node dimensions for proper arrow positioning
    const getNodeDimensions = (node: GraphNode) => {
      const maxCharsPerLine = 14
      const words = node.name.split(' ')
      let lines = ['']
      let currentLine = 0
      
      words.forEach(word => {
        if ((lines[currentLine] + ' ' + word).length > maxCharsPerLine && lines[currentLine].length > 0) {
          lines.push(word)
          currentLine++
        } else {
          lines[currentLine] = lines[currentLine] ? lines[currentLine] + ' ' + word : word
        }
      })
      
      const width = Math.max(120, Math.min(200, Math.max(...lines.map(line => line.length * 8))))
      const height = Math.max(50, lines.length * 16 + 20)
      
      return { width, height }
    }

    // Path creation with top/bottom midpoint connections as requested
    const createOptimizedPath = (sourceNode: GraphNode, targetNode: GraphNode) => {
      if (!sourceNode.x || !sourceNode.y || !targetNode.x || !targetNode.y) return ''
      
      // Use the same node dimension calculation as the rectangle rendering
      const calculateDims = (node: GraphNode) => {
        const maxCharsPerLine = 14
        const words = node.name.split(' ')
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

    
    // Create enhanced links with improved visibility
    const linkElements = graphContainer.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(filteredLinks)
      .enter().append('path')
      .attr('class', 'link')
      .style('stroke', '#6B7280')  // Darker gray for better visibility
      .style('stroke-opacity', 0.8)  // Higher opacity for better visibility
      .style('stroke-width', 2.5)    // Slightly thicker for better visibility
      .style('fill', 'none')

    // Create arrowheads for directed links
    const defs = svgElement.append('defs')
    
    // Regular arrow for normal links
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 8) // Position at the very end of the line
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4L2,0Z') // Sharper arrow shape
      .style('fill', '#6B7280')
    
    // Highlighted arrow for thick links
    defs.append('marker')
      .attr('id', 'arrow-highlighted')
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 8) // Position at the very end of the line
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4L2,0Z') // Sharper arrow shape
      .style('fill', '#6B7280')

    linkElements.attr('marker-end', 'url(#arrow)')
      .attr('d', linkData => {
        const sourceNode = typeof linkData.source === 'object' ? linkData.source : data.nodes.find(node => node.id === linkData.source)
        const targetNode = typeof linkData.target === 'object' ? linkData.target : data.nodes.find(node => node.id === linkData.target)
        
        if (!sourceNode || !targetNode) return ''
        
        return createOptimizedPath(sourceNode, targetNode)
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
      .style('stroke', nodeData => nodeData.selected ? '#059669' : getStatusBorderColor(nodeData.status)) // Green border for selected
      .style('stroke-width', nodeData => nodeData.selected ? 6 : 4) // Thicker border for selected
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
        linkElements.style('stroke-opacity', linkData => {
          const sourceId = typeof linkData.source === 'string' ? linkData.source : linkData.source.id
          const targetId = typeof linkData.target === 'string' ? linkData.target : linkData.target.id
          return (sourceId === nodeData.id || targetId === nodeData.id) ? 1.0 : 0.2
        }).style('stroke-width', linkData => {
          const sourceId = typeof linkData.source === 'string' ? linkData.source : linkData.source.id
          const targetId = typeof linkData.target === 'string' ? linkData.target : linkData.target.id
          return (sourceId === nodeData.id || targetId === nodeData.id) ? 4 : 2
        }).attr('marker-end', linkData => {
          const sourceId = typeof linkData.source === 'string' ? linkData.source : linkData.source.id
          const targetId = typeof linkData.target === 'string' ? linkData.target : linkData.target.id
          return (sourceId === nodeData.id || targetId === nodeData.id) ? 'url(#arrow-highlighted)' : 'url(#arrow)'
        })
      })
      .on('mouseout', function(event, nodeData) {
        setHoveredNode(null)
        
        // Reset node
        d3.select(this).select('.node')
          .style('fill', getNodeColor(nodeData, nodeData.id === selectedNodeId, false))
          .style('transform', 'scale(1.0)')
        
        // Reset links to default state
        linkElements.style('stroke-opacity', 0.8)
          .style('stroke-width', 2.5)
          .attr('marker-end', 'url(#arrow)')
      })
    // Click timeout for single/double click detection
    let clickTimeout: NodeJS.Timeout | null = null

    nodeGroups
      .on('click', function(event, nodeData) {
        // Prevent any default behavior
        event.preventDefault()
        event.stopPropagation()
        
        // Delay single click to allow for double-click detection
        if (clickTimeout) {
          clearTimeout(clickTimeout)
          clickTimeout = null
        }
        
        clickTimeout = setTimeout(() => {
          // Store current transform state before callbacks
          const savedTransform = persistentTransform.current
          
          // Execute callbacks (this will cause re-render)
          onNodeClick?.(nodeData)
          onNodeSelect?.(nodeData)
          
          clickTimeout = null
        }, 250) // 250ms delay to detect double-click
      })
      .on('dblclick', function(event, nodeData) {
        event.preventDefault()
        event.stopPropagation()
        
        // Cancel single click if double-click occurs
        if (clickTimeout) {
          clearTimeout(clickTimeout)
          clickTimeout = null
        }
        
        console.log('Double-click detected on global graph node:', nodeData.name, 'ID:', nodeData.id)
        onNodeDoubleClick?.(nodeData)
      })

    // Advanced Edge Detection & Auto-Fix Algorithm
    const runEdgeDetectionAudit = () => {
      console.log('\n🔍 === ADVANCED EDGE DETECTION & AUTO-FIX AUDIT ===')
      
      // 1. Expected edges from data
      const expectedEdges = data.links.map(link => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id
        const targetId = typeof link.target === 'string' ? link.target : link.target.id
        const sourceNode = data.nodes.find(n => n.id === sourceId)
        const targetNode = data.nodes.find(n => n.id === targetId)
        
        return {
          sourceId,
          targetId,
          sourceName: sourceNode?.name || 'Unknown',
          targetName: targetNode?.name || 'Unknown',
          expected: true,
          originalLinkData: link
        }
      })
      
      console.log(`📊 Expected edges: ${expectedEdges.length}`)
      
      // 2. Analyze filtered links vs original data
      console.log(`📊 Original data.links: ${data.links.length}`)
      console.log(`📊 Filtered links: ${filteredLinks.length}`)
      
      if (filteredLinks.length < data.links.length) {
        const filteredOutCount = data.links.length - filteredLinks.length
        console.warn(`⚠️  ${filteredOutCount} links were filtered out! Investigating...`)
        
        const filteredOutLinks = data.links.filter(originalLink => {
          const sourceId = typeof originalLink.source === 'string' ? originalLink.source : originalLink.source.id
          const targetId = typeof originalLink.target === 'string' ? originalLink.target : originalLink.target.id
          
          return !filteredLinks.some(filteredLink => {
            const filteredSourceId = typeof filteredLink.source === 'string' ? filteredLink.source : filteredLink.source.id
            const filteredTargetId = typeof filteredLink.target === 'string' ? filteredLink.target : filteredLink.target.id
            return filteredSourceId === sourceId && filteredTargetId === targetId
          })
        })
        
        console.log('\n🚨 FILTERED OUT LINKS (ROOT CAUSE #1):')
        filteredOutLinks.forEach((link, index) => {
          const sourceId = typeof link.source === 'string' ? link.source : link.source.id
          const targetId = typeof link.target === 'string' ? link.target : link.target.id
          const sourceNode = data.nodes.find(n => n.id === sourceId)
          const targetNode = data.nodes.find(n => n.id === targetId)
          
          console.log(`  ${index + 1}. ${sourceNode?.name || sourceId} → ${targetNode?.name || targetId}`)
          console.log(`     Problem: Source exists: ${!!sourceNode}, Target exists: ${!!targetNode}`)
          
          if (!sourceNode) console.log(`     Missing source node ID: ${sourceId}`)
          if (!targetNode) console.log(`     Missing target node ID: ${targetId}`)
        })
      }
      
      // 3. Actually rendered edges from DOM
      const renderedEdges: any[] = []
      linkElements.each(function(linkData) {
        const sourceId = typeof linkData.source === 'string' ? linkData.source : linkData.source.id
        const targetId = typeof linkData.target === 'string' ? linkData.target : linkData.target.id
        const pathElement = d3.select(this)
        const pathData = pathElement.attr('d')
        const computedStyle = window.getComputedStyle(this)
        
        // Comprehensive visibility check
        const hasValidPath = pathData && pathData !== '' && pathData !== 'M 0,0 L 0,0'
        const hasValidStroke = computedStyle.stroke !== 'none' && computedStyle.stroke !== 'transparent'
        const hasValidOpacity = parseFloat(computedStyle.strokeOpacity || '1') > 0.01
        const hasValidWidth = parseFloat(computedStyle.strokeWidth || '0') > 0
        const isVisible = hasValidPath && hasValidStroke && hasValidOpacity && hasValidWidth
        
        renderedEdges.push({
          sourceId,
          targetId,
          pathData,
          isVisible,
          hasValidPath,
          hasValidStroke,
          hasValidOpacity,
          hasValidWidth,
          computedStyle: {
            stroke: computedStyle.stroke,
            strokeOpacity: computedStyle.strokeOpacity,
            strokeWidth: computedStyle.strokeWidth
          },
          element: this,
          linkData
        })
      })
      
      console.log(`📊 Rendered DOM elements: ${renderedEdges.length}`)
      console.log(`📊 Visible edges: ${renderedEdges.filter(e => e.isVisible).length}`)
      
      // 4. Analyze invisible edges (ROOT CAUSE ANALYSIS)
      const invisibleEdges = renderedEdges.filter(e => !e.isVisible)
      if (invisibleEdges.length > 0) {
        console.log('\n🔍 INVISIBLE EDGE ANALYSIS (ROOT CAUSE #2):')
        invisibleEdges.forEach((edge, index) => {
          const sourceNode = data.nodes.find(n => n.id === edge.sourceId)
          const targetNode = data.nodes.find(n => n.id === edge.targetId)
          
          console.log(`  ${index + 1}. ${sourceNode?.name || edge.sourceId} → ${targetNode?.name || edge.targetId}`)
          console.log(`     Path: ${edge.hasValidPath ? '✅' : '❌'} "${edge.pathData}"`)
          console.log(`     Stroke: ${edge.hasValidStroke ? '✅' : '❌'} "${edge.computedStyle.stroke}"`)
          console.log(`     Opacity: ${edge.hasValidOpacity ? '✅' : '❌'} "${edge.computedStyle.strokeOpacity}"`)
          console.log(`     Width: ${edge.hasValidWidth ? '✅' : '❌'} "${edge.computedStyle.strokeWidth}"`)
          
          // Identify the specific problem
          if (!edge.hasValidPath) {
            if (edge.pathData === 'M 0,0 L 0,0') {
              console.log(`     🎯 PROBLEM: Both nodes at origin (0,0) - positioning issue`)
            } else if (!edge.pathData || edge.pathData === '') {
              console.log(`     🎯 PROBLEM: No path data - coordinate calculation failed`)
            }
          }
          if (!edge.hasValidStroke) {
            console.log(`     🎯 PROBLEM: Invalid stroke color - CSS styling issue`)
          }
          if (!edge.hasValidOpacity) {
            console.log(`     🎯 PROBLEM: Zero opacity - visibility styling issue`)
          }
          if (!edge.hasValidWidth) {
            console.log(`     🎯 PROBLEM: Zero width - sizing styling issue`)
          }
        })
      }
      
      // 5. Find missing edges
      const missingEdges = expectedEdges.filter(expected => {
        return !renderedEdges.some(rendered => 
          rendered.sourceId === expected.sourceId && 
          rendered.targetId === expected.targetId &&
          rendered.isVisible
        )
      })
      
      // 6. Auto-fix attempts
      let fixedCount = 0
      
      if (missingEdges.length > 0) {
        console.log('\n🔧 ATTEMPTING AUTOMATIC FIXES...')
        
        missingEdges.forEach((missingEdge, index) => {
          const sourceNode = data.nodes.find(n => n.id === missingEdge.sourceId)
          const targetNode = data.nodes.find(n => n.id === missingEdge.targetId)
          
          if (sourceNode && targetNode) {
            console.log(`🔧 Attempting to fix: ${missingEdge.sourceName} → ${missingEdge.targetName}`)
            
            // Check if there's a DOM element for this edge but it's invisible
            const invisibleElement = renderedEdges.find(r => 
              r.sourceId === missingEdge.sourceId && 
              r.targetId === missingEdge.targetId && 
              !r.isVisible
            )
            
            if (invisibleElement) {
              console.log(`  🎯 Found invisible DOM element, attempting to fix...`)
              
              const element = d3.select(invisibleElement.element)
              let fixed = false
              
              // Fix #1: Recalculate path with current coordinates
              const sourceX = sourceNode.x || sourceNode.fx || 0
              const sourceY = sourceNode.y || sourceNode.fy || 0
              const targetX = targetNode.x || targetNode.fx || 0
              const targetY = targetNode.y || 0
              
              if (sourceX !== 0 || sourceY !== 0 || targetX !== 0 || targetY !== 0) {
                const newPath = `M ${sourceX},${sourceY} L ${targetX},${targetY}`
                element.attr('d', newPath)
                console.log(`    ✅ Updated path: ${newPath}`)
                fixed = true
              }
              
              // Fix #2: Reset styling
              element
                .style('stroke', '#6B7280')
                .style('stroke-opacity', 0.8)
                .style('stroke-width', 2.5)
                .style('fill', 'none')
                .attr('marker-end', 'url(#arrow)')
              
              console.log(`    ✅ Reset styling`)
              fixed = true
              
              if (fixed) {
                fixedCount++
                console.log(`  ✅ FIXED: ${missingEdge.sourceName} → ${missingEdge.targetName}`)
              }
            } else {
              // No DOM element exists - need to create one
              console.log(`  🎯 No DOM element found, creating new edge...`)
              
              const newEdge = graphContainer.select('.links').append('path')
                .attr('class', 'link auto-fix')
                .style('stroke', '#FF6B6B') // Red color to distinguish auto-fixed edges
                .style('stroke-opacity', 0.9)
                .style('stroke-width', 3)
                .style('fill', 'none')
                .attr('marker-end', 'url(#arrow)')
              
              // Set initial path
              const sourceX = sourceNode.x || sourceNode.fx || 0
              const sourceY = sourceNode.y || sourceNode.fy || 0
              const targetX = targetNode.x || targetNode.fx || 0
              const targetY = targetNode.y || targetNode.fy || 0
              const newPath = `M ${sourceX},${sourceY} L ${targetX},${targetY}`
              
              newEdge.attr('d', newPath)
              
              console.log(`  ✅ CREATED NEW EDGE: ${missingEdge.sourceName} → ${missingEdge.targetName}`)
              fixedCount++
            }
          }
        })
      }
      
      // 7. Visual debugging for remaining missing edges
      const remainingMissing = missingEdges.filter((_, index) => index >= fixedCount)
      if (remainingMissing.length > 0) {
        console.log('\n🎯 Adding visual indicators for remaining missing edges...')
        
        remainingMissing.forEach((missingEdge, index) => {
          const sourceNode = data.nodes.find(n => n.id === missingEdge.sourceId)
          const targetNode = data.nodes.find(n => n.id === missingEdge.targetId)
          
          if (sourceNode && targetNode) {
            const debugLine = graphContainer.append('path')
              .attr('class', 'missing-edge-debug')
              .attr('data-source-id', missingEdge.sourceId)
              .attr('data-target-id', missingEdge.targetId)
              .style('stroke', 'red')
              .style('stroke-width', 3)
              .style('stroke-dasharray', '5,5')
              .style('opacity', 0.8)
              .style('fill', 'none')
              .style('pointer-events', 'none')
            
            const midX = ((sourceNode.x || sourceNode.fx || 0) + (targetNode.x || targetNode.fx || 0)) / 2
            const midY = ((sourceNode.y || sourceNode.fy || 0) + (targetNode.y || targetNode.fy || 0)) / 2
            
            graphContainer.append('text')
              .attr('class', 'missing-edge-label')
              .attr('x', midX)
              .attr('y', midY)
              .attr('text-anchor', 'middle')
              .style('fill', 'red')
              .style('font-size', '10px')
              .style('font-weight', 'bold')
              .style('pointer-events', 'none')
              .text(`STILL MISSING #${index + 1}`)
          }
        })
      }
      
      // 8. Final report
      console.log('\n📋 FINAL AUDIT RESULTS:')
      console.log(`📊 Expected edges: ${expectedEdges.length}`)
      console.log(`📊 Rendered edges: ${renderedEdges.length}`)
      console.log(`📊 Visible edges: ${renderedEdges.filter(e => e.isVisible).length}`)
      console.log(`📊 Missing edges: ${missingEdges.length}`)
      console.log(`🔧 Auto-fixed edges: ${fixedCount}`)
      console.log(`🚨 Still missing: ${missingEdges.length - fixedCount}`)
      
      if (missingEdges.length - fixedCount === 0) {
        console.log('🎉 ALL EDGES NOW VISIBLE! Auto-fix successful!')
      } else {
        console.log('⚠️  Some edges still missing after auto-fix attempt')
      }
      
      console.log('=== END ADVANCED AUDIT ===\n')
      
      return {
        expected: expectedEdges.length,
        rendered: renderedEdges.length,
        visible: renderedEdges.filter(e => e.isVisible).length,
        missing: missingEdges.length,
        fixed: fixedCount,
        stillMissing: missingEdges.length - fixedCount
      }
    }

    // Since simulation is stopped, set initial positions and render immediately
    data.nodes.forEach(node => {
      if (node.fx !== undefined) node.x = node.fx
      if (node.fy !== undefined) node.y = node.fy
    })

    // Set initial link paths
    linkElements.attr('d', linkData => {
      const sourceNode = typeof linkData.source === 'object' ? linkData.source : data.nodes.find(node => node.id === linkData.source)
      const targetNode = typeof linkData.target === 'object' ? linkData.target : data.nodes.find(node => node.id === linkData.target)
      
      if (!sourceNode || !targetNode) {
        return ''
      }
      
      return createOptimizedPath(sourceNode, targetNode)
    })

    // Set initial node positions
    nodeGroups.attr('transform', nodeData => `translate(${nodeData.x || 0}, ${nodeData.y || 0})`)

    // Apply centering if needed (after nodes are positioned)
    if (centerOnNodeId) {
      const targetNode = data.nodes.find(node => node.id === centerOnNodeId)
      if (targetNode && targetNode.x !== undefined && targetNode.y !== undefined) {
        const centerX = width / 2
        const centerY = height / 2
        const scale = 1.0
        const translateX = centerX - targetNode.x * scale
        const translateY = centerY - targetNode.y * scale
        
        const centeringTransform = d3.zoomIdentity
          .translate(translateX, translateY)
          .scale(scale)
        
        // Apply centering transform immediately
        svgElement.call(zoomBehavior.transform, centeringTransform)
        graphContainer.attr('transform', centeringTransform.toString())
        
        // Update persistent transform state
        persistentTransform.current = centeringTransform
      }
    }

    // Run edge detection audit after initial positioning
    setTimeout(() => {
      runEdgeDetectionAudit()
    }, 2000) // Wait 2 seconds for graph to stabilize

    // Clean up on unmount
    return () => {
      forceSimulation.stop()
    }
  }, [isClientMounted, data, width, height, onNodeClick, onNodeSelect, centerOnNodeId])
  
  // Handle selectedNodeId changes separately without re-rendering the entire graph
  useEffect(() => {
    if (!isClientMounted || !svgRef.current) return
    
    const svgElement = d3.select(svgRef.current)
    const nodeGroups = svgElement.selectAll('.node-group')
    
    // Update node colors based on selection without repositioning
    nodeGroups.select('.node')
      .style('fill', (nodeData: any) => {
        const isSelected = nodeData.id === selectedNodeId
        const isHovered = false
        return getNodeColor(nodeData, isSelected, isHovered)
      })
      
  }, [selectedNodeId, isClientMounted])

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
      

    </div>
  )
}