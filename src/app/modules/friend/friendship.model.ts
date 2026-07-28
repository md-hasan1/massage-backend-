import { Schema, model, Document, Types } from 'mongoose';

export interface IFriendship extends Document {
  requester: Types.ObjectId;
  recipient: Types.ObjectId;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const friendshipSchema = new Schema<IFriendship>(
  {
    requester: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce unique relations between two users
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

export const Friendship = model<IFriendship>('Friendship', friendshipSchema);
export default Friendship;
