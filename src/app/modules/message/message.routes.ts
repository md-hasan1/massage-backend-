import { Router } from 'express';
import MessageController from './message.controller';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import { upload } from '../../helpers/upload';
import { editMessageSchema, getMessagesSchema } from './message.validation';

const router = Router();
const controller = new MessageController();

router.get('/:chatId', auth, validate(getMessagesSchema), controller.getChatMessages);
router.patch('/:chatId/delivered', auth, controller.markAsDelivered);
router.patch('/:id', auth, validate(editMessageSchema), controller.editMessage);
router.delete('/:id/everyone', auth, controller.deleteForEveryone);
router.delete('/:id/me', auth, controller.deleteForMe);
router.post('/upload', auth, upload.single('file'), controller.uploadAttachment);

export const messageRoutes = router;
export default messageRoutes;
