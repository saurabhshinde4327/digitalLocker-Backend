const Document = require('../models/document');
const User = require('../models/user');
const fs = require('fs');
const path = require('path');
const ActivityLog = require('../models/activityLog');
const axios = require('axios');

const getLocationFromIP = async (ip) => {
  if (ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') {
    return 'Localhost';
  }
  try {
    const geo = await axios.get(`https://ipapi.co/${ip}/json/`);
    if (geo.data && (geo.data.city || geo.data.country_name)) {
      return geo.data.city ? `${geo.data.city}, ${geo.data.country_name}` : geo.data.country_name;
    }
    return 'Unknown';
  } catch (err) {
    console.error('GeoIP lookup failed:', err.message);
    return 'Unknown';
  }
};

const uploadFile = async (req, res) => {
  try {
    const user = req.user;
    const file = req.file;
    const fileType = req.fileType;

    const document = new Document({
      studentId: user.studentId,
      fileName: file.filename,
      filePath: path.join(process.env.UPLOADS_DIR, user.studentId, file.filename),
      fileSize: file.size,
      fileType: fileType,
    });
    await document.save();

    user.storageUsed += file.size;
    await user.save();

    // Log activity for document upload
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const location = await getLocationFromIP(ip);
    await ActivityLog.create({ user: user._id, action: 'upload_document', ip, location });
    console.log('ActivityLog created for upload_document:', user._id, ip, location);

    res.status(201).json({ message: 'File uploaded successfully', document });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload error' });
  }
};

const getDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ studentId: req.user.studentId });
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Error fetching documents' });
  }
};

const searchDocuments = async (req, res) => {
  try {
    const { query } = req.query;
    const documents = await Document.find({
      studentId: req.user.studentId,
      fileName: { $regex: query, $options: 'i' },
    });
    res.json(documents);
  } catch (error) {
    console.error('Error searching documents:', error);
    res.status(500).json({ error: 'Error searching documents' });
  }
};

const downloadDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document || document.studentId !== req.user.studentId) {
      return res.status(404).json({ error: 'Document not found or not authorized' });
    }

    // Log activity for document download
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const location = await getLocationFromIP(ip);
    await ActivityLog.create({ user: req.user._id, action: 'download_document', ip, location });
    console.log('ActivityLog created for download_document:', req.user._id, ip, location);

    res.status(200).json({ message: 'File downloaded successfully', document });
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Error downloading document' });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document || document.studentId !== req.user.studentId) {
      return res.status(404).json({ error: 'Document not found or not authorized' });
    }

    fs.unlinkSync(document.filePath);
    await Document.deleteOne({ _id: req.params.id });

    req.user.storageUsed -= document.fileSize;
    await req.user.save();

    // Log activity for document delete
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const location = await getLocationFromIP(ip);
    await ActivityLog.create({ user: req.user._id, action: 'delete_document', ip, location });
    console.log('ActivityLog created for delete_document:', req.user._id, ip, location);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Error deleting document' });
  }
};

const toggleFavorite = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document || document.studentId !== req.user.studentId) {
      return res.status(404).json({ error: 'Document not found or not authorized' });
    }

    document.isFavorite = !document.isFavorite;
    await document.save();

    // Log activity for favorite toggle
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const location = await getLocationFromIP(ip);
    await ActivityLog.create({ user: req.user._id, action: 'toggle_favorite', ip, location });
    console.log('ActivityLog created for toggle_favorite:', req.user._id, ip, location);

    res.json({ message: 'Favorite status updated', document });
  } catch (error) {
    console.error('Error updating favorite status:', error);
    res.status(500).json({ error: 'Error updating favorite status' });
  }
};

module.exports = { uploadFile, getDocuments, searchDocuments, deleteDocument, toggleFavorite };