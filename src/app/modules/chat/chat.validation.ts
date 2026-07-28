import { z } from 'zod';
import { Types } from 'mongoose';

export const createPrivateChatSchema = z.object({
  body: z.object({
    recipientId: z.string().min(1, 'Recipient user ID is required').refine((val) => Types.ObjectId.isValid(val), {
      message: 'Invalid recipient ID format',
    }),
  }),
});
