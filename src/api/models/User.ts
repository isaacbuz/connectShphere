import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  walletAddress: string;
  bio: string;
  avatar: string;
  socialLinks: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
  preferences: {
    theme: 'light' | 'dark';
    notifications: {
      email: boolean;
      push: boolean;
      mentions: boolean;
    };
    privacy: {
      profileVisibility: 'public' | 'private' | 'friends';
      contentVisibility: 'public' | 'private' | 'friends';
    };
  };
  followers: mongoose.Types.ObjectId[];
  following: mongoose.Types.ObjectId[];
  followersCount: number;
  followingCount: number;
  contentCount: number;
  totalEarnings: number;
  stats: {
    followers: number;
    following: number;
    posts: number;
    reputation: number;
  };
  tokens: {
    balance: number;
    staked: number;
    earned: number;
  };
  isVerified: boolean;
  isActive: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  bio: {
    type: String,
    default: '',
    maxlength: 500
  },
  avatar: {
    type: String,
    default: ''
  },
  socialLinks: {
    twitter: String,
    linkedin: String,
    github: String
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      mentions: {
        type: Boolean,
        default: true
      }
    },
    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'private', 'friends'],
        default: 'public'
      },
      contentVisibility: {
        type: String,
        enum: ['public', 'private', 'friends'],
        default: 'public'
      }
    }
  },
  followers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  followersCount: {
    type: Number,
    default: 0
  },
  followingCount: {
    type: Number,
    default: 0
  },
  contentCount: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  stats: {
    followers: {
      type: Number,
      default: 0
    },
    following: {
      type: Number,
      default: 0
    },
    posts: {
      type: Number,
      default: 0
    },
    reputation: {
      type: Number,
      default: 0
    }
  },
  tokens: {
    balance: {
      type: Number,
      default: 0
    },
    staked: {
      type: Number,
      default: 0
    },
    earned: {
      type: Number,
      default: 0
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ walletAddress: 1 });
UserSchema.index({ 'stats.reputation': -1 });

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual for full profile URL
UserSchema.virtual('profileUrl').get(function() {
  return `/profile/${this.username}`;
});

// JSON transform to exclude password
UserSchema.set('toJSON', {
  transform: function(doc, ret) {
    delete ret.password;
    return ret;
  }
});

export const User = mongoose.model<IUser>('User', UserSchema); 