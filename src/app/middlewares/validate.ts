import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { AppError } from '../../utils/AppError';

export const validate = (schema: ZodTypeAny) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Collect all error messages from Zod validation issues
        const errorMessages = error.issues.map((err: any) => err.message).join(', ');
        return next(new AppError(errorMessages, 400));
      }
      return next(error);
    }
  };
};
export default validate;
