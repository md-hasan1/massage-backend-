import { Router } from 'express';
import NotificationController from './notification.controller';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import { notificationIdParamSchema } from './notification.validation';

const router = Router();
const controller = new NotificationController();

router.get('/', auth, controller.getNotifications);
router.patch('/read-all', auth, controller.markAllAsRead);
router.patch('/:id/read', auth, validate(notificationIdParamSchema), controller.markAsRead);
router.delete('/clear-all', auth, controller.clearAllNotifications);
router.delete('/:id', auth, validate(notificationIdParamSchema), controller.deleteNotification);

export const notificationRoutes = router;
export default notificationRoutes;
