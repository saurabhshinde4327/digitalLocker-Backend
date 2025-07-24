const User = require('../models/user');
const jwt = require('jsonwebtoken');
const ActivityLog = require('../models/activityLog');
const axios = require('axios');
const { sendAlertEmail } = require('../utils/emailUtils');

const getLocationFromIP = async (ip) => {
  // Handle localhost and IPv6 loopback
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

const register = async (req, res) => {
  try {
    console.log('REGISTER BODY:', req.body);
    const { name, phone, email, studentId, password, department } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { studentId }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Email or Student ID already exists' });
    }

    const user = new User({ name, phone, email, studentId, password, department });
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    user.ip = ip;
    user.location = await getLocationFromIP(ip);
    await user.save();

    const token = jwt.sign(
      { userId: user._id, studentId: user.studentId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' } // Standardized to 1 day
    );
    await ActivityLog.create({ user: user._id, action: 'register', ip: user.ip, location: user.location });
    const updatedUser = await User.findById(user._id);
    res.status(201).json({ 
      token, 
      user: { 
        _id: updatedUser._id, 
        name: updatedUser.name, 
        email: updatedUser.email, 
        studentId: updatedUser.studentId, 
        department: updatedUser.department,
        role: updatedUser.role,
        ip: updatedUser.ip,
        location: updatedUser.location
      } 
    });
    console.log('ActivityLog created for register:', user._id, user.ip, user.location);
  } catch (error) {
    console.error('Register error:', error);
    res.status(400).json({ error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const user = await User.findOne({
      $or: [{ email: identifier }, { studentId: identifier }],
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check login time (10am-5pm)
    const now = new Date();
    const hour = now.getHours();
    if (hour < 10 || hour >= 17) {
      // Send alert email
      sendAlertEmail(
        'ALERT: Login Attempt Outside Allowed Hours',
        `User ${user.email} (ID: ${user.studentId}) attempted login at ${now.toLocaleString()} from IP: ${req.headers['x-forwarded-for'] || req.connection.remoteAddress}`
      );
    }

    const token = jwt.sign(
      { userId: user._id, studentId: user.studentId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' } // Standardized to 1 day
    );
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    user.ip = ip;
    user.location = await getLocationFromIP(ip);
    await user.save();
    await ActivityLog.create({ user: user._id, action: 'login', ip: user.ip, location: user.location });
    const updatedUser = await User.findById(user._id);
    res.json({ token, user: { _id: updatedUser._id, name: updatedUser.name, email: updatedUser.email, studentId: updatedUser.studentId, role: updatedUser.role, ip: updatedUser.ip, location: updatedUser.location } });
    console.log('ActivityLog created for login:', user._id, user.ip, user.location);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, role: 'admin' });
    if (!user) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Check login time (10am-5pm)
    const now = new Date();
    const hour = now.getHours();
    if (hour < 10 || hour >= 17) {
      // Send alert email
      sendAlertEmail(
        'ALERT: Admin Login Attempt Outside Allowed Hours',
        `Admin ${user.email} (ID: ${user.studentId}) attempted login at ${now.toLocaleString()} from IP: ${req.headers['x-forwarded-for'] || req.connection.remoteAddress}`
      );
    }

    const token = jwt.sign(
      { userId: user._id, studentId: user.studentId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' } // Standardized to 1 day
    );
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    user.ip = ip;
    user.location = await getLocationFromIP(ip);
    if (!user.department) user.department = 'admin';
    await user.save();
    await ActivityLog.create({ user: user._id, action: 'admin_login', ip: user.ip, location: user.location });
    const updatedUser = await User.findById(user._id);
    res.json({ token, user: { _id: updatedUser._id, name: updatedUser.name, email: updatedUser.email, studentId: updatedUser.studentId, role: updatedUser.role, ip: updatedUser.ip, location: updatedUser.location, department: updatedUser.department } });
    console.log('ActivityLog created for admin_login:', user._id, user.ip, user.location);
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Admin login failed' });
  }
};

module.exports = { register, login, adminLogin };