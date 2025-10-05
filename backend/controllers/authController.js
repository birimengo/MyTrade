const crypto = require('crypto');
const User = require('../models/User');
const sendEmail = require('../utils/email');

// Generate reset token
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Forgot password - send reset email
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      // For security, don't reveal if email exists or not
      return res.status(200).json({
        success: true,
        message: 'If your email is registered, you will receive a password reset link'
      });
    }

    // Check if user has too many reset attempts
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    if (user.lastResetAttempt && user.lastResetAttempt > oneHourAgo && user.resetPasswordAttempts >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Too many reset attempts. Please try again later.'
      });
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const resetTokenExpiry = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour expiry

    // Save token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    user.resetPasswordAttempts += 1;
    user.lastResetAttempt = now;
    
    await user.save();

    // Create reset URL (for simulation, we'll include the token in the response)
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Send email (will simulate if not configured)
    try {
      await sendEmail({
        to: email,
        subject: 'Password Reset Request - Trade Uganda',
        html: `
          <h2>Password Reset Request</h2>
          <p>You requested a password reset for your Trade Uganda account.</p>
          <p>Click the link below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #F9A52B; color: white; text-decoration: none; border-radius: 5px;">
            Reset Password
          </a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this reset, please ignore this email.</p>
          <p><strong>Reset Token (for testing):</strong> ${resetToken}</p>
        `
      });

      // Include the token in development for testing
      const response = {
        success: true,
        message: 'Password reset email sent successfully'
      };

      // In development, include the token for testing
      if (process.env.NODE_ENV === 'development') {
        response.debug = {
          resetToken: resetToken,
          resetUrl: resetUrl
        };
      }

      res.status(200).json(response);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      
      // For development, still return success but include the token
      const response = {
        success: true,
        message: 'Password reset initiated. Check server logs for reset token.',
        debug: {
          resetToken: resetToken,
          resetUrl: resetUrl
        }
      };

      res.status(200).json(response);
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing password reset',
      error: error.message
    });
  }
};

// Reset password - validate token and set new password
exports.resetPassword = async (req, res) => {
  try {
    const { token, email, newPassword } = req.body;

    if (!token || !email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token, email, and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Find user by email and token
    const user = await User.findOne({
      email,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.resetPasswordAttempts = 0;
    user.lastResetAttempt = null;
    
    await user.save();

    // Try to send confirmation email (but don't fail if it doesn't work)
    try {
      await sendEmail({
        to: email,
        subject: 'Password Reset Successful - Trade Uganda',
        html: `
          <h2>Password Reset Successful</h2>
          <p>Your Trade Uganda password has been successfully reset.</p>
          <p>If you did not perform this action, please contact support immediately.</p>
        `
      });
    } catch (emailError) {
      console.error('Confirmation email error:', emailError);
      // Continue even if confirmation email fails
    }

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while resetting password',
      error: error.message
    });
  }
};

// Validate reset token
exports.validateResetToken = async (req, res) => {
  try {
    const { token, email } = req.query;

    if (!token || !email) {
      return res.status(400).json({
        success: false,
        message: 'Token and email are required'
      });
    }

    const user = await User.findOne({
      email,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Token is valid'
    });

  } catch (error) {
    console.error('Validate token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while validating token',
      error: error.message
    });
  }
};