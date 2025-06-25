import mongoose, { Document, Schema } from 'mongoose';

export interface IContent extends Document {
  author: mongoose.Types.ObjectId;
  type: 'post' | 'comment' | 'story' | 'poll';
  title?: string;
  body: string;
  content: string;
  media: {
    images: string[];
    videos: string[];
    audio: string[];
  };
  mediaUrls: string[];
  ipfsHash: string;
  status: 'pending_moderation' | 'approved' | 'rejected' | 'flagged';
  likes: mongoose.Types.ObjectId[];
  likeCount: number;
  shareCount: number;
  comments: {
    author: mongoose.Types.ObjectId;
    content: string;
    createdAt: Date;
  }[];
  reports: {
    reporter: mongoose.Types.ObjectId;
    reason: string;
    details?: string;
    reportedAt: Date;
    status: 'pending' | 'resolved' | 'dismissed';
  }[];
  blockchain: {
    tokenId?: string;
    transactionHash?: string;
    blockNumber?: number;
    isMinted: boolean;
  };
  engagement: {
    likes: number;
    dislikes: number;
    shares: number;
    comments: number;
    views: number;
  };
  moderation: {
    status: 'pending' | 'approved' | 'rejected' | 'flagged';
    score: number;
    flags: {
      reason: string;
      reporter: mongoose.Types.ObjectId;
      timestamp: Date;
    }[];
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
  };
  tags: string[];
  visibility: 'public' | 'private' | 'friends';
  parentContent?: mongoose.Types.ObjectId;
  mentions: mongoose.Types.ObjectId[];
  location?: {
    type: 'Point';
    coordinates: [number, number];
    address?: string;
  };
  metadata: {
    language: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    topics: string[];
    aiGenerated: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ContentSchema = new Schema<IContent>({
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['post', 'comment', 'story', 'poll'],
    required: true
  },
  title: {
    type: String,
    maxlength: 200
  },
  body: {
    type: String,
    required: true,
    maxlength: 10000
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000
  },
  media: {
    images: [String],
    videos: [String],
    audio: [String]
  },
  mediaUrls: [String],
  ipfsHash: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending_moderation', 'approved', 'rejected', 'flagged'],
    default: 'pending_moderation'
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  likeCount: {
    type: Number,
    default: 0
  },
  shareCount: {
    type: Number,
    default: 0
  },
  comments: [{
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  reports: [{
    reporter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    details: String,
    reportedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'resolved', 'dismissed'],
      default: 'pending'
    }
  }],
  blockchain: {
    tokenId: String,
    transactionHash: String,
    blockNumber: Number,
    isMinted: {
      type: Boolean,
      default: false
    }
  },
  engagement: {
    likes: {
      type: Number,
      default: 0
    },
    dislikes: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    comments: {
      type: Number,
      default: 0
    },
    views: {
      type: Number,
      default: 0
    }
  },
  moderation: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'flagged'],
      default: 'pending'
    },
    score: {
      type: Number,
      default: 0
    },
    flags: [{
      reason: {
        type: String,
        required: true
      },
      reporter: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  visibility: {
    type: String,
    enum: ['public', 'private', 'friends'],
    default: 'public'
  },
  parentContent: {
    type: Schema.Types.ObjectId,
    ref: 'Content'
  },
  mentions: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      index: '2dsphere'
    },
    address: String
  },
  metadata: {
    language: {
      type: String,
      default: 'en'
    },
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
      default: 'neutral'
    },
    topics: [String],
    aiGenerated: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Indexes
ContentSchema.index({ author: 1, createdAt: -1 });
ContentSchema.index({ type: 1, createdAt: -1 });
ContentSchema.index({ 'moderation.status': 1 });
ContentSchema.index({ status: 1 });
ContentSchema.index({ tags: 1 });
ContentSchema.index({ 'engagement.likes': -1 });
ContentSchema.index({ 'blockchain.isMinted': 1 });

// Virtual for engagement score
ContentSchema.virtual('engagementScore').get(function() {
  return this.engagement.likes * 2 + this.engagement.shares * 3 + this.engagement.comments - this.engagement.dislikes;
});

// Pre-save middleware to update parent content comment count
ContentSchema.pre('save', async function(next) {
  if (this.isNew && this.parentContent) {
    await mongoose.model('Content').findByIdAndUpdate(
      this.parentContent,
      { $inc: { 'engagement.comments': 1 } }
    );
  }
  next();
});

export const Content = mongoose.model<IContent>('Content', ContentSchema); 