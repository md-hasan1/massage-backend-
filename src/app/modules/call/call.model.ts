import { Schema, model, Document, Types } from 'mongoose';

export interface ICall extends Document {
  caller: Types.ObjectId;
  receiver: Types.ObjectId;
  type: 'voice' | 'video';
  status: 'missed' | 'completed' | 'rejected' | 'busy';
  duration: number; // call duration in seconds
  deletedBy: Types.ObjectId[]; // users who deleted this call log from their history
  createdAt: Date;
  updatedAt: Date;
}

const callSchema = new Schema<ICall>(
  {
    caller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['voice', 'video'],
      required: true,
    },
    status: {
      type: String,
      enum: ['missed', 'completed', 'rejected', 'busy'],
      required: true,
    },
    duration: {
      type: Number,
      default: 0,
    },
    deletedBy: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes to efficiently retrieve call history excluding logs deleted by this user
callSchema.index({ caller: 1, deletedBy: 1 });
callSchema.index({ receiver: 1, deletedBy: 1 });

export const Call = model<ICall>('Call', callSchema);
export default Call;
