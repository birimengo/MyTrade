// backend/routes/userSettings.js
const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const userSetupService = require('../services/userSetupService');
const router = express.Router();

// GET /api/user/settings/notifications - Get notification settings
router.get('/settings/notifications', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('notificationPreferences reminderSettings');
    
    res.json({
      success: true,
      settings: user.notificationPreferences,
      reminderSettings: user.reminderSettings,
      setupInstructions: userSetupService.getWhatsAppSetupInstructions(user)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching notification settings',
      error: error.message
    });
  }
});

// PUT /api/user/settings/notifications - Update notification settings
router.put('/settings/notifications', auth, async (req, res) => {
  try {
    const { whatsapp, email, push, sms, phoneNumber, apiKey } = req.body;
    
    const updates = {};
    
    if (whatsapp !== undefined) {
      updates['notificationPreferences.whatsapp.enabled'] = whatsapp;
    }
    
    if (email !== undefined) {
      updates['notificationPreferences.email'] = email;
    }
    
    if (push !== undefined) {
      updates['notificationPreferences.push'] = push;
    }
    
    if (sms !== undefined) {
      updates['notificationPreferences.sms'] = sms;
    }
    
    if (phoneNumber) {
      updates['notificationPreferences.whatsapp.phoneNumber'] = phoneNumber;
    }
    
    if (apiKey) {
      updates['notificationPreferences.whatsapp.apiKey'] = apiKey;
      updates['notificationPreferences.whatsapp.activatedAt'] = new Date();
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true }
    ).select('notificationPreferences reminderSettings');
    
    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      settings: user.notificationPreferences
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating notification settings',
      error: error.message
    });
  }
});

// POST /api/user/settings/validate-whatsapp - Validate WhatsApp API key
router.post('/settings/validate-whatsapp', auth, async (req, res) => {
  try {
    const { phoneNumber, apiKey } = req.body;
    
    if (!phoneNumber || !apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and API key are required'
      });
    }
    
    const validation = await userSetupService.validateUserApiKey(phoneNumber, apiKey);
    
    if (validation.valid) {
      // Save the validated API key
      await User.findByIdAndUpdate(req.user.id, {
        $set: {
          'notificationPreferences.whatsapp.apiKey': apiKey,
          'notificationPreferences.whatsapp.phoneNumber': phoneNumber,
          'notificationPreferences.whatsapp.enabled': true,
          'notificationPreferences.whatsapp.activatedAt': new Date(),
          'notificationPreferences.whatsapp.lastTested': new Date()
        }
      });
    }
    
    res.json({
      success: validation.valid,
      message: validation.message,
      details: validation.details
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error validating WhatsApp settings',
      error: error.message
    });
  }
});

// PUT /api/user/settings/reminders - Update reminder settings
router.put('/settings/reminders', auth, async (req, res) => {
  try {
    const { advanceNotice, workingHours, quietMode } = req.body;
    
    const updates = {};
    
    if (advanceNotice) {
      updates['reminderSettings.advanceNotice'] = advanceNotice;
    }
    
    if (workingHours) {
      if (workingHours.start) updates['reminderSettings.workingHours.start'] = workingHours.start;
      if (workingHours.end) updates['reminderSettings.workingHours.end'] = workingHours.end;
      if (workingHours.timezone) updates['reminderSettings.workingHours.timezone'] = workingHours.timezone;
    }
    
    if (quietMode) {
      if (quietMode.enabled !== undefined) updates['reminderSettings.quietMode.enabled'] = quietMode.enabled;
      if (quietMode.start) updates['reminderSettings.quietMode.start'] = quietMode.start;
      if (quietMode.end) updates['reminderSettings.quietMode.end'] = quietMode.end;
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true }
    ).select('reminderSettings');
    
    res.json({
      success: true,
      message: 'Reminder settings updated successfully',
      settings: user.reminderSettings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating reminder settings',
      error: error.message
    });
  }
});

// GET /api/user/settings/whatsapp-setup - Get WhatsApp setup instructions
router.get('/settings/whatsapp-setup', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.json({
      success: true,
      instructions: userSetupService.getWhatsAppSetupInstructions(user)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching setup instructions',
      error: error.message
    });
  }
});

module.exports = router;