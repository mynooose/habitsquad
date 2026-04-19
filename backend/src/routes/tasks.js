const express = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/tasks.controller');

const router = express.Router();

router.use(authenticate);

router.get('/budget', ctrl.getBudget);
router.get('/', ctrl.listTasks);
router.get('/:id', ctrl.getTask);
router.post('/', ctrl.createTask);
router.put('/:id', ctrl.updateTask);
router.delete('/:id', ctrl.deleteTask);
router.post('/:id/complete', ctrl.completeTask);
router.delete('/:id/complete', ctrl.uncompleteTask);

module.exports = router;
