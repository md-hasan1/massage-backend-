import { Router } from 'express';
import AuthController from './auth.controller';
import validate from '../../middlewares/validate';
import auth from '../../middlewares/auth';
import { registerSchema, loginSchema, refreshTokenSchema, googleAuthSchema } from './auth.validation';

const router = Router();
const controller = new AuthController();

router.post('/register', validate(registerSchema), controller.register);
router.post('/login', validate(loginSchema), controller.login);
router.post('/google', validate(googleAuthSchema), controller.googleLogin);
router.post('/refresh', validate(refreshTokenSchema), controller.refresh);
router.post('/logout', validate(refreshTokenSchema), controller.logout);
router.post('/fcm-token', auth, controller.saveFcmToken);
router.delete('/fcm-token', auth, controller.removeFcmToken);

export const authRoutes = router;
export default authRoutes;
