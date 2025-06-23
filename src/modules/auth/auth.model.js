import mongoose from 'mongoose';

const authSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  accessToken: {
    type: String,
    required: true,
  },
  refreshToken: {
    type: String,
    required: true,
  },
  deviceInfo: {
    userAgent: String,
    ip: String,
    device: String,
    browser: String,
    os: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
authSessionSchema.index({ userId: 1 });
authSessionSchema.index({ sessionId: 1 });
authSessionSchema.index({ refreshToken: 1 });
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
authSessionSchema.index({ isActive: 1 });

// Static method to find active sessions by user
authSessionSchema.statics.findActiveSessionsByUser = function(userId) {
  return this.find({ userId, isActive: true });
};

// Static method to cleanup expired sessions
authSessionSchema.statics.cleanupExpiredSessions = function() {
  return this.deleteMany({ expiresAt: { $lt: new Date() } });
};

// Instance method to update last activity
authSessionSchema.methods.updateActivity = async function() {
  this.lastActivity = new Date();
  return this.save();
};

// Instance method to revoke session
authSessionSchema.methods.revoke = async function() {
  this.isActive = false;
  return this.save();
};

const authAttemptSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  ip: {
    type: String,
    required: true,
  },
  userAgent: String,
  success: {
    type: Boolean,
    required: true,
  },
  failureReason: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Indexes
authAttemptSchema.index({ email: 1, createdAt: -1 });
authAttemptSchema.index({ ip: 1, createdAt: -1 });
authAttemptSchema.index({ userId: 1 });
authAttemptSchema.index({ success: 1 });

// Static method to get failed attempts
authAttemptSchema.statics.getFailedAttempts = function(email, ip, timeWindow = 15 * 60 * 1000) {
  const since = new Date(Date.now() - timeWindow);
  return this.countDocuments({
    $or: [{ email }, { ip }],
    success: false,
    createdAt: { $gte: since },
  });
};

// Static method to check if account is locked
authAttemptSchema.statics.isAccountLocked = async function(email, maxAttempts = 5) {
  const failedAttempts = await this.getFailedAttempts(email, null);
  return failedAttempts >= maxAttempts;
};

const passwordResetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
  },
  used: {
    type: Boolean,
    default: false,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  ip: String,
  userAgent: String,
}, {
  timestamps: true,
});

// Indexes
passwordResetSchema.index({ token: 1 });
passwordResetSchema.index({ userId: 1 });
passwordResetSchema.index({ email: 1 });
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Instance method to mark as used
passwordResetSchema.methods.markAsUsed = async function() {
  this.used = true;
  return this.save();
};

// Static method to find valid token
passwordResetSchema.statics.findValidToken = function(token) {
  return this.findOne({
    token,
    used: false,
    expiresAt: { $gt: new Date() },
  });
};

export const AuthSession = mongoose.model('AuthSession', authSessionSchema);
export const AuthAttempt = mongoose.model('AuthAttempt', authAttemptSchema);
export const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);
