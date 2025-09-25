import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId;
  action: string;
  resource: string;
  resourceId?: mongoose.Types.ObjectId;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const AuditLogSchema = new Schema<IAuditLog>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      // User management actions
      'user_created', 'user_updated', 'user_deleted', 'user_deactivated', 'user_reactivated',
      'pin_reset', 'role_changed',
      // Time entry management
      'time_entry_created', 'time_entry_updated', 'time_entry_deleted', 'time_entry_approved',
      'bulk_time_entry_update',
      // Schedule management
      'shift_created', 'shift_updated', 'shift_deleted', 'shift_assigned', 'bulk_shift_creation',
      'template_created', 'template_updated', 'template_deleted', 'template_applied',
      // System actions
      'login_success', 'login_failed', 'logout', 'password_change', 'unauthorized_access_attempt',
      // Data exports
      'data_exported', 'report_generated',
      // Security actions
      'permission_escalation', 'security_violation', 'suspicious_activity'
    ]
  },
  resource: {
    type: String,
    required: true,
    enum: ['user', 'time_entry', 'shift', 'template', 'system', 'auth', 'export', 'report']
  },
  resourceId: {
    type: Schema.Types.ObjectId,
    required: false
  },
  details: {
    type: Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  }
});

// Index for efficient querying
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, timestamp: -1 });
AuditLogSchema.index({ severity: 1, timestamp: -1 });
AuditLogSchema.index({ timestamp: -1 });

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);