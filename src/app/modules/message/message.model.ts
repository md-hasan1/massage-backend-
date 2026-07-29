import { Schema, model, Document, Types } from 'mongoose';

export interface IMessage extends Document {
  chatId: Types.ObjectId;
  senderId: Types.ObjectId;
  messageType: 'text' | 'image' | 'audio' | 'file' | 'call_log';
  content: string;
  fileInfo?: {
    name: string;
    size: number;
    mimeType: string;
    caption?: string;
  };
  status: 'sent' | 'delivered' | 'seen';
  replyTo?: Types.ObjectId;
  isEdited: boolean;
  isDeletedForEveryone: boolean;
  deletedBy: Types.ObjectId[];
  deliveredAt?: Date;
  seenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    chatId: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'audio', 'file', 'call_log'],
      default: 'text',
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    fileInfo: {
      name: { type: String },
      size: { type: Number },
      mimeType: { type: String },
      caption: { type: String },
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'seen'],
      default: 'sent',
      required: true,
    },
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    deliveredAt: {
      type: Date,
    },
    seenAt: {
      type: Date,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    isDeletedForEveryone: {
      type: Boolean,
      default: false,
    },
    deletedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for fast querying of message history
messageSchema.index({ chatId: 1, createdAt: 1 });

export const Message = model<IMessage>('Message', messageSchema);
export default Message;
