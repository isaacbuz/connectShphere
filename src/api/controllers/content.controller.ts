import { Request, Response } from 'express';
import { Content } from '../models/Content';
import { User } from '../models/User';
import { Interaction } from '../models/Interaction';

// Create content
export const createContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { title, body, type, tags, visibility, mediaUrls } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!title || !body) {
      res.status(400).json({ error: 'Title and body are required' });
      return;
    }

    const content = new Content({
      author: userId,
      title,
      body,
      type: type || 'post',
      tags: tags || [],
      visibility: visibility || 'public',
      mediaUrls: mediaUrls || [],
      status: 'pending_moderation'
    });

    await content.save();

    // Update user's content count
    await User.findByIdAndUpdate(userId, {
      $inc: { contentCount: 1, 'stats.posts': 1 }
    });

    // Populate author info
    await content.populate('author', 'username avatar bio');

    res.status(201).json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Error creating content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get content by ID
export const getContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const content = await Content.findById(id)
      .populate('author', 'username avatar bio followersCount')
      .populate('likes', 'username avatar')
      .populate('comments.author', 'username avatar');

    if (!content) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }

    // Check visibility
    if (content.visibility === 'private' && content.author._id.toString() !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Track view if authenticated
    if (userId && userId !== content.author._id.toString()) {
      await Interaction.create({
        user: userId,
        content: id,
        type: 'view'
      });
    }

    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update content
export const updateContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { title, body, tags, visibility, mediaUrls } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const content = await Content.findById(id);
    if (!content) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }

    if (content.author.toString() !== userId) {
      res.status(403).json({ error: 'Not authorized to update this content' });
      return;
    }

    const updatedContent = await Content.findByIdAndUpdate(
      id,
      {
        title,
        body,
        tags,
        visibility,
        mediaUrls,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).populate('author', 'username avatar bio');

    res.json({
      success: true,
      data: updatedContent
    });
  } catch (error) {
    console.error('Error updating content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete content
export const deleteContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const content = await Content.findById(id);
    if (!content) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }

    if (content.author.toString() !== userId) {
      res.status(403).json({ error: 'Not authorized to delete this content' });
      return;
    }

    await Content.findByIdAndDelete(id);

    // Update user's content count
    await User.findByIdAndUpdate(userId, {
      $inc: { contentCount: -1, 'stats.posts': -1 }
    });

    // Delete related interactions
    await Interaction.deleteMany({ content: id });

    res.json({
      success: true,
      message: 'Content deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Moderate content (AI-powered)
export const moderateContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    if (!req.user?.id) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const content = await Content.findById(id);
    if (!content) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }

    // TODO: Integrate with AI moderation agent
    const moderationResult = {
      status: (action === 'approve' ? 'approved' : 'rejected') as 'approved' | 'rejected' | 'flagged' | 'pending',
      score: 0.8,
      flags: [],
      reviewedBy: req.user.id,
      reviewedAt: new Date()
    };

    content.moderation = moderationResult;
    content.status = moderationResult.status === 'approved' ? 'approved' : 'rejected';
    await content.save();

    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Error moderating content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Like content
export const likeContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const content = await Content.findById(id);
    if (!content) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }

    const isLiked = content.likes.includes(userId);

    if (isLiked) {
      // Unlike
      await Content.findByIdAndUpdate(id, {
        $pull: { likes: userId },
        $inc: { likeCount: -1 }
      });
    } else {
      // Like
      await Content.findByIdAndUpdate(id, {
        $addToSet: { likes: userId },
        $inc: { likeCount: 1 }
      });
    }

    // Track interaction
    await Interaction.findOneAndUpdate(
      { user: userId, content: id, type: 'like' },
      { 
        user: userId, 
        content: id, 
        type: 'like',
        value: !isLiked
      },
      { upsert: true }
    );

    res.json({
      success: true,
      message: isLiked ? 'Content unliked' : 'Content liked'
    });
  } catch (error) {
    console.error('Error liking content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Share content
export const shareContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { platform, message } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const content = await Content.findById(id);
    if (!content) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }

    // Increment share count
    await Content.findByIdAndUpdate(id, {
      $inc: { shareCount: 1 }
    });

    // Track interaction
    await Interaction.create({
      user: userId,
      content: id,
      type: 'share',
      metadata: { platform, message }
    });

    res.json({
      success: true,
      message: 'Content shared successfully'
    });
  } catch (error) {
    console.error('Error sharing content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Report content
export const reportContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { reason, details } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!reason) {
      res.status(400).json({ error: 'Reason is required' });
      return;
    }

    const content = await Content.findById(id);
    if (!content) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }

    // Create report
    const report = {
      reporter: userId,
      reason,
      details,
      reportedAt: new Date(),
      status: 'pending' as const
    };

    await Content.findByIdAndUpdate(id, {
      $push: { reports: report }
    });

    res.json({
      success: true,
      message: 'Content reported successfully'
    });
  } catch (error) {
    console.error('Error reporting content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get feed
export const getFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Get content from followed users and public content
    const followingIds = user.following;
    const query = {
      $or: [
        { author: { $in: followingIds } },
        { visibility: 'public' }
      ],
      status: 'approved'
    };

    const content = await Content.find(query)
      .populate('author', 'username avatar bio')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Content.countDocuments(query);

    res.json({
      success: true,
      data: content,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + content.length < total
      }
    });
  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 