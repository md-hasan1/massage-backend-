import CallRepository from './call.repository';
import { ICall } from './call.model';
import { AppError } from '../../../utils/AppError';

export class CallService {
  private callRepository: CallRepository;

  constructor() {
    this.callRepository = new CallRepository();
  }

  async createCallLog(
    callerId: string,
    receiverId: string,
    type: 'voice' | 'video',
    status: 'missed' | 'completed' | 'rejected' | 'busy',
    duration?: number
  ): Promise<ICall> {
    return this.callRepository.create({
      caller: callerId,
      receiver: receiverId,
      type,
      status,
      duration,
    });
  }

  async getCallHistory(userId: string): Promise<ICall[]> {
    return this.callRepository.findByUser(userId);
  }

  async deleteCallLog(id: string, userId: string): Promise<ICall> {
    const call = await this.callRepository.findById(id);
    if (!call) {
      throw new AppError('Call log not found', 404);
    }

    // Verify user is part of the call before allowing soft deletion
    const isCaller = call.caller._id.toString() === userId;
    const isReceiver = call.receiver._id.toString() === userId;
    if (!isCaller && !isReceiver) {
      throw new AppError('Unauthorized: You are not a participant in this call', 403);
    }

    const updatedCall = await this.callRepository.softDelete(id, userId);
    return updatedCall!;
  }

  async clearCallHistory(userId: string): Promise<void> {
    await this.callRepository.clearAll(userId);
  }
}

export default CallService;
