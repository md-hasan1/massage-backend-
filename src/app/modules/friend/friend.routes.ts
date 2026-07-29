import { Router } from 'express';
import FriendController from './friend.controller';
import auth from '../../middlewares/auth';

const router = Router();
const controller = new FriendController();

router.post('/request', auth, controller.sendRequest);
router.post('/respond', auth, controller.respondRequest);
router.get('/list', auth, controller.getFriends);
router.get('/requests/pending', auth, controller.getPendingRequests);
router.post('/remove', auth, controller.removeFriend);
router.get('/search', auth, controller.searchUsers);
router.post('/block', auth, controller.blockUser);
router.post('/unblock', auth, controller.unblockUser);
router.get('/blocked', auth, controller.getBlockedUsers);

export const friendRoutes = router;
export default friendRoutes;
