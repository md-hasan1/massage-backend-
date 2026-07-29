import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import friendRoutes from '../modules/friend/friend.routes';
import chatRoutes from '../modules/chat/chat.routes';
import messageRoutes from '../modules/message/message.routes';
import callRoutes from '../modules/call/call.routes';
import notificationRoutes from '../modules/notification/notification.routes';

const router = Router();

// List of all module routers to be mounted under /api/v1
const moduleRoutes = [
  {
    path: '/auth',
    route: authRoutes,
  },
  {
    path: '/friends',
    route: friendRoutes,
  },
  {
    path: '/chats',
    route: chatRoutes,
  },
  {
    path: '/messages',
    route: messageRoutes,
  },
  {
    path: '/calls',
    route: callRoutes,
  },
  {
    path: '/notifications',
    route: notificationRoutes,
  },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export const apiRouter = router;
export default apiRouter;
