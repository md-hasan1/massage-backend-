import { Router } from 'express';
import CallController from './call.controller';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import { createCallLogSchema, callIdParamSchema } from './call.validation';

const router = Router();
const controller = new CallController();

router.post('/', auth, validate(createCallLogSchema), controller.createCallLog);
router.get('/', auth, controller.getCallHistory);
router.delete('/clear', auth, controller.clearCallHistory);
router.delete('/:id', auth, validate(callIdParamSchema), controller.deleteCallLog);

export const callRoutes = router;
export default callRoutes;
