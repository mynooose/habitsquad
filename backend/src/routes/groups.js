const express = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/groups.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', ctrl.listGroups);
router.post('/', ctrl.createGroup);
router.post('/join', ctrl.joinGroup);
router.get('/:id', ctrl.getGroup);
router.put('/:id', ctrl.updateGroup);
router.post('/:id/invite', ctrl.inviteToGroup);
router.delete('/:id/invite/:inviteId', ctrl.cancelInvite);
router.get('/:id/member-tasks', ctrl.getMemberTasks);
router.get('/:id/leaderboard', ctrl.getLeaderboard);
router.get('/:id/analytics', ctrl.getAnalytics);
router.delete('/:id/members/:userId', ctrl.removeMember);
router.put('/:id/members/:userId/role', ctrl.updateMemberRole);
router.delete('/:id/leave', ctrl.leaveGroup);

module.exports = router;
