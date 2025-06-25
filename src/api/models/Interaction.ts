import mongoose, { Document, Schema } from 'mongoose';

export interface IInteraction extends Document {
  user: mongoose.Types.ObjectId;
  content: mongoose.Types.ObjectId;
  type: 'view' | 'like' | 'share' | 'comment' | 'report';
  value?: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const InteractionSchema = new Schema<IInteraction>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: Schema.Types.ObjectId,
    ref: 'Content',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['view', 'like', 'share', 'comment', 'report'],
    required: true
  },
  value: {
    type: Boolean,
    default: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Compound index for user-content-type uniqueness
InteractionSchema.index({ user: 1, content: 1, type: 1 }, { unique: true });

// Indexes for analytics
InteractionSchema.index({ type: 1, createdAt: -1 });
InteractionSchema.index({ content: 1, type: 1 });
InteractionSchema.index({ user: 1, type: 1 });

export const Interaction = mongoose.model<IInteraction>('Interaction', InteractionSchema); 