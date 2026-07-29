import { z } from 'zod';
import { Types } from 'mongoose';

export const notificationIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Notification ID is required').refine((val) => Types.ObjectId.isValid(val), {
      message: 'Invalid notification ID format',
    }),
  }),
});
