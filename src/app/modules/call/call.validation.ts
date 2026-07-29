import { z } from 'zod';
import { Types } from 'mongoose';

export const createCallLogSchema = z.object({
  body: z.object({
    receiverId: z.string().min(1, 'Receiver ID is required').refine((val) => Types.ObjectId.isValid(val), {
      message: 'Invalid receiver ID format',
    }),
    type: z.enum(['voice', 'video'] as [string, ...string[]], {
      message: 'Call type must be voice or video',
    }),
    status: z.enum(['missed', 'completed', 'rejected', 'busy'] as [string, ...string[]], {
      message: 'Call status must be missed, completed, rejected, or busy',
    }),
    duration: z.number().int().nonnegative().optional(),
  }),
});

export const callIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Call log ID is required').refine((val) => Types.ObjectId.isValid(val), {
      message: 'Invalid call log ID format',
    }),
  }),
});
