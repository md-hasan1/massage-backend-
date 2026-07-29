import { Types } from 'mongoose';
import Call, { ICall } from './call.model';

export class CallRepository {
  async create(callData: {
    caller: string;
    receiver: string;
    type: 'voice' | 'video';
    status: 'missed' | 'completed' | 'rejected' | 'busy';
    duration?: number;
  }): Promise<ICall> {
    const call = await Call.create({
      caller: new Types.ObjectId(callData.caller),
      receiver: new Types.ObjectId(callData.receiver),
      type: callData.type,
      status: callData.status,
      duration: callData.duration || 0,
      deletedBy: [],
    });
    return call.populate('caller receiver', 'name email photoUrl');
  }

  async findByUser(userId: string): Promise<ICall[]> {
    const userObjectId = new Types.ObjectId(userId);
    return Call.find({
      $or: [{ caller: userObjectId }, { receiver: userObjectId }],
      deletedBy: { $ne: userObjectId },
    })
      .sort({ createdAt: -1 })
      .populate('caller receiver', 'name email photoUrl')
      .exec();
  }

  async findById(id: string): Promise<ICall | null> {
    return Call.findById(id).populate('caller receiver', 'name email photoUrl').exec();
  }

  async update(id: string, updateData: Partial<ICall>): Promise<ICall | null> {
    return Call.findByIdAndUpdate(id, updateData, {
      returnDocument: 'after',
      runValidators: true,
    })
      .populate('caller receiver', 'name email photoUrl')
      .exec();
  }

  async softDelete(id: string, userId: string): Promise<ICall | null> {
    return Call.findByIdAndUpdate(
      id,
      { $addToSet: { deletedBy: new Types.ObjectId(userId) } },
      { returnDocument: 'after' }
    )
      .populate('caller receiver', 'name email photoUrl')
      .exec();
  }

  async clearAll(userId: string): Promise<any> {
    const userObjectId = new Types.ObjectId(userId);
    return Call.updateMany(
      {
        $or: [{ caller: userObjectId }, { receiver: userObjectId }],
        deletedBy: { $ne: userObjectId },
      },
      { $addToSet: { deletedBy: userObjectId } }
    ).exec();
  }
}

export default CallRepository;
