// Returns a Prisma `where` clause that restricts topics to active trees.
// Falls back to no filter (all topics) when no trees are marked active.
import { prisma } from '@/lib/prisma'

export async function buildActiveTreeFilter(): Promise<{ treeId: { in: string[] } } | undefined> {
  const activeTrees = await prisma.knowledgeTree.findMany({
    where: { isActive: true },
    select: { id: true },
  })

  if (activeTrees.length === 0) return undefined

  return { treeId: { in: activeTrees.map(t => t.id) } }
}
