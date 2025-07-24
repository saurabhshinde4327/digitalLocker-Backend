const User = require('../models/user');
const Document = require('../models/document');
const fs = require('fs');
const path = require('path');
const ActivityLog = require('../models/activityLog');

const getAllUsers = async (req, res) => {
  try {
    // Explicitly select ip and location
    const users = await User.find({}, '-password').select('name phone email studentId department role storageUsed photoPath ip location');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
};

const getAllDocuments = async (req, res) => {
  try {
    const documents = await Document.find();
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Error fetching documents' });
  }
};

const getUserActivityLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const logs = await ActivityLog.find({ user: userId }).sort({ timestamp: -1 });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Error fetching activity logs' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Find all documents of the user
    const documents = await Document.find({ studentId: user.studentId });

    // Delete all document files
    for (const doc of documents) {
      if (fs.existsSync(doc.filePath)) {
        fs.unlinkSync(doc.filePath);
      }
    }

    // Delete user's upload directory if it exists
    const userUploadDir = path.join(process.env.UPLOADS_DIR, user.studentId);
    if (fs.existsSync(userUploadDir)) {
      fs.rmSync(userUploadDir, { recursive: true, force: true });
    }

    // Delete all documents from database
    await Document.deleteMany({ studentId: user.studentId });

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.json({ message: 'User and all associated documents deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Error deleting user' });
  }
};

const dumpUserAndActivityData = async (req, res) => {
  try {
    const users = await User.find({}, { name: 1, ip: 1, location: 1 }).limit(10);
    const activitylogs = await ActivityLog.find({}).sort({ timestamp: -1 }).limit(10);
    res.json({ users, activitylogs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAllUsers, getAllDocuments, deleteUser, getUserActivityLogs, dumpUserAndActivityData };