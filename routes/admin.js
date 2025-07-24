const express = require('express');
const router = express.Router();
const { auth, isSuperAdmin } = require('../middleware/auth');
const { getAllUsers, getAllDocuments, deleteUser, getUserActivityLogs, dumpUserAndActivityData } = require('../controllers/adminController');

router.get('/users', auth, isSuperAdmin, getAllUsers);
router.get('/documents', auth, isSuperAdmin, getAllDocuments);
router.delete('/users/:userId', auth, isSuperAdmin, deleteUser);
router.get('/users/:userId/activity-logs', auth, isSuperAdmin, getUserActivityLogs);
router.get('/debug-dump', auth, isSuperAdmin, dumpUserAndActivityData);

module.exports = router;