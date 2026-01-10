import { Router } from 'express';
import { authenticate, requireUser } from '../../middleware/auth.js';

// Import user sub-routes
import chatRoutes from './chat.js';
import historyRoutes from './history.js';
import profileRoutes from './profile.js';

const router = Router();

// Apply authentication to all user routes
router.use(authenticate);
router.use(requireUser);

// Mount sub-routes
router.use('/chat', chatRoutes);
router.use('/history', historyRoutes);
router.use('/profile', profileRoutes);

export default router;

