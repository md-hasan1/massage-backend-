import { z } from 'zod';
import { Types } from 'mongoose';

export const editMessageSchema = z.object({
  body: z.object({
    content: z.string().trim().min(1, 'Message content cannot be empty'),
  }),
});

export const getMessagesSchema = z.object({
  params: z.object({
    chatId: z.string().min(1, 'Chat ID is required').refine((val) => Types.ObjectId.isValid(val), {
      message: 'Invalid chat ID format',
    }),
  }),
});
