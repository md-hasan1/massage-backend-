import { Session, ISession } from './session.model';

export class SessionRepository {
  async create(sessionData: {
    userId: string;
    token: string;
    deviceInfo?: string;
    ipAddress?: string;
    expiresAt: Date;
  }): Promise<ISession> {
    return Session.create(sessionData);
  }

  async findByToken(token: string): Promise<ISession | null> {
    return Session.findOne({ token, isValid: true }).exec();
  }

  async invalidateToken(token: string): Promise<void> {
    await Session.updateOne({ token }, { isValid: false }).exec();
  }

  async deleteByToken(token: string): Promise<void> {
    await Session.deleteOne({ token }).exec();
  }

  async deleteByUserId(userId: string): Promise<void> {
    await Session.deleteMany({ userId }).exec();
  }
}
export default SessionRepository;
