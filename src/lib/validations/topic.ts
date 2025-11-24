import { z } from 'zod'

export const createTopicSchema = z.object({
  name: z.union([
    z.string().min(1, 'Name is required').max(100),
    z.record(z.string(), z.string().min(1, 'Name is required').max(100))
  ]),
  slug: z.string().min(1, 'Slug is required').max(100).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  type: z.enum(['THEORY', 'PRACTICE', 'PROJECT']),
  description: z.union([
    z.string().optional(),
    z.record(z.string(), z.string()).optional()
  ]).optional(),
  keypoints: z.union([
    z.string().min(1, 'Key points are required'),
    z.record(z.string(), z.string().min(1, 'Key points are required'))
  ]),
  prerequisiteIds: z.array(z.string()).optional(),
})

export const updateTopicSchema = createTopicSchema.partial().extend({
  id: z.string(),
})

export type CreateTopicData = z.infer<typeof createTopicSchema>
export type UpdateTopicData = z.infer<typeof updateTopicSchema>