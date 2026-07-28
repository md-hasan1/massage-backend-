import { Router } from 'express';
import ChatController from './chat.controller';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import { createPrivateChatSchema } from './chat.validation';

const router = Router();
const controller = new ChatController();

router.get('/', auth, controller.getUserChats);
router.post('/private', auth, validate(createPrivateChatSchema), controller.getOrCreatePrivateChat);
router.post('/:id/read', auth, controller.resetUnreadCount);
router.post('/:id/pin', auth, controller.pinChat);
router.post('/:id/unpin', auth, controller.unpinChat);

export const chatRoutes = router;
export default chatRoutes;
