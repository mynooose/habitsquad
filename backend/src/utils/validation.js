const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters')
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required')
});

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(500).optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'ONCE', 'WEEKDAYS', 'WEEKENDS', 'CUSTOM']).default('DAILY'),
  weightage: z.number().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  groupId: z.string().nullable().optional(),
  requiresProof: z.boolean().optional(),
  redistribute: z.boolean().optional()
});

const updateTaskSchema = createTaskSchema.partial().extend({
  isActive: z.boolean().optional()
});

const createGroupSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isPublic: z.boolean().default(false)
});

const inviteSchema = z.object({
  email: z.string().email().optional(),
  userId: z.string().optional()
}).refine(data => data.email || data.userId, {
  message: 'Either email or userId is required'
});

module.exports = {
  registerSchema,
  loginSchema,
  createTaskSchema,
  updateTaskSchema,
  createGroupSchema,
  inviteSchema,
};
