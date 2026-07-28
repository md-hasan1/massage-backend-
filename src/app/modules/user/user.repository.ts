import { User, IUser } from './user.model';
import { UpdateQuery } from 'mongoose';

export class UserRepository {
  async create(userData: Partial<IUser>): Promise<IUser> {
    return User.create(userData);
  }

  async findByEmail(email: string, includePassword = false): Promise<IUser | null> {
    const query = User.findOne({ email, isDeleted: false });
    if (includePassword) {
      query.select('+password');
    }
    return query.exec();
  }

  async findById(id: string): Promise<IUser | null> {
    return User.findOne({ _id: id, isDeleted: false }).exec();
  }

  async update(id: string, updateData: UpdateQuery<IUser>): Promise<IUser | null> {
    return User.findOneAndUpdate({ _id: id, isDeleted: false }, updateData, {
      new: true,
      runValidators: true,
    }).exec();
  }
}
export default UserRepository;
