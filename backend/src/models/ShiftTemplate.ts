import mongoose, { Document, Schema } from 'mongoose';

export interface IShiftTemplate extends Document {
  name: string;
  description?: string;
  department: string;
  shifts: {
    dayOfWeek: number; // 0-6 (Sunday-Saturday)
    startTime: string;
    endTime: string;
    position: string;
    staffCount: number;
  }[];
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ShiftTemplateSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  shifts: [{
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6
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
    staffCount: {
      type: Number,
      required: true,
      min: 1
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model<IShiftTemplate>('ShiftTemplate', ShiftTemplateSchema);