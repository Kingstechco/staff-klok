import mongoose, { Document, Schema } from 'mongoose';

export interface IShift extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  startTime: string;
  endTime: string;
  position: string;
  department: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'no-show' | 'cancelled';
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  modifiedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ShiftSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter valid time format (HH:MM)']
  },
  endTime: {
    type: String,
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter valid time format (HH:MM)']
  },
  position: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'completed', 'no-show', 'cancelled'],
    default: 'scheduled'
  },
  notes: {
    type: String,
    maxlength: 500
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  modifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index for conflict detection
ShiftSchema.index({ userId: 1, date: 1, status: 1 });
ShiftSchema.index({ date: 1, department: 1 });
ShiftSchema.index({ date: 1, startTime: 1, endTime: 1 });

export default mongoose.model<IShift>('Shift', ShiftSchema);