import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { toast } from 'react-toastify';

interface Post {
  id: string;
  title: string;
  body: string;
  author: {
    username: string;
    avatar: string;
  };
  likeCount: number;
  shareCount: number;
  createdAt: string;
}

const Home: React.FC = () => {
  const { account, connectWallet, disconnectWallet } = useWeb3();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState({ title: '', body: '' });

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      const mockPosts: Post[] = [
        {
          id: '1',
          title: 'Welcome to Starling.ai! 🐦',
          body: 'Where social flocks become financial flocks. Join the revolution of AI-powered decentralized social networking.',
          author: {
            username: 'starling_ai',
            avatar: '/api/placeholder/40/40'
          },
          likeCount: 42,
          shareCount: 12,
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          title: 'AI-Powered Content Moderation',
          body: 'Our autonomous agents are working 24/7 to keep the platform safe and engaging for everyone.',
          author: {
            username: 'ai_moderator',
            avatar: '/api/placeholder/40/40'
          },
          likeCount: 28,
          shareCount: 8,
          createdAt: new Date(Date.now() - 3600000).toISOString()
        }
      ];
      setPosts(mockPosts);
    } catch (error) {
      toast.error('Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!newPost.title || !newPost.body) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      // TODO: Replace with actual API call
      const post: Post = {
        id: Date.now().toString(),
        title: newPost.title,
        body: newPost.body,
        author: {
          username: account.slice(0, 8) + '...',
          avatar: '/api/placeholder/40/40'
        },
        likeCount: 0,
        shareCount: 0,
        createdAt: new Date().toISOString()
      };

      setPosts([post, ...posts]);
      setNewPost({ title: '', body: '' });
      toast.success('Post created successfully!');
    } catch (error) {
      toast.error('Failed to create post');
    }
  };

  const handleLike = async (postId: string) => {
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }

    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, likeCount: post.likeCount + 1 }
        : post
    ));
    toast.success('Post liked!');
  };

  return (
    <div className="home-container">
      <div className="hero-section">
        <h1>Welcome to Starling.ai</h1>
        <p className="tagline">Where social flocks become financial flocks 🐦✨</p>
        
        {!account ? (
          <div className="connect-section">
            <p>Connect your wallet to start earning STARL tokens</p>
            <button 
              className="connect-button"
              onClick={connectWallet}
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="wallet-info">
            <p>Connected: {account}</p>
            <button 
              className="disconnect-button"
              onClick={disconnectWallet}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {account && (
        <div className="create-post-section">
          <h3>Create a Post</h3>
          <form onSubmit={handleCreatePost} className="post-form">
            <input
              type="text"
              placeholder="Post title..."
              value={newPost.title}
              onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
              className="post-title-input"
            />
            <textarea
              placeholder="What's on your mind?"
              value={newPost.body}
              onChange={(e) => setNewPost({ ...newPost, body: e.target.value })}
              className="post-body-input"
              rows={3}
            />
            <button type="submit" className="create-post-button">
              Create Post
            </button>
          </form>
        </div>
      )}

      <div className="feed-section">
        <h3>Latest Posts</h3>
        {loading ? (
          <div className="loading">Loading posts...</div>
        ) : (
          <div className="posts-grid">
            {posts.map(post => (
              <div key={post.id} className="post-card">
                <div className="post-header">
                  <img 
                    src={post.author.avatar} 
                    alt={post.author.username}
                    className="author-avatar"
                  />
                  <div className="post-meta">
                    <h4>{post.title}</h4>
                    <p className="author">by {post.author.username}</p>
                    <p className="timestamp">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p className="post-body">{post.body}</p>
                <div className="post-actions">
                  <button 
                    onClick={() => handleLike(post.id)}
                    className="like-button"
                  >
                    ❤️ {post.likeCount}
                  </button>
                  <button className="share-button">
                    📤 {post.shareCount}
                  </button>
                  <button className="comment-button">
                    💬 Comment
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="features-section">
        <h3>Platform Features</h3>
        <div className="features-grid">
          <div className="feature-card">
            <h4>🤖 AI-Powered</h4>
            <p>Autonomous agents for content moderation and personalization</p>
          </div>
          <div className="feature-card">
            <h4>💰 Crypto Rewards</h4>
            <p>Earn STARL tokens for creating and curating quality content</p>
          </div>
          <div className="feature-card">
            <h4>🔗 Decentralized</h4>
            <p>True ownership of your content with blockchain integration</p>
          </div>
          <div className="feature-card">
            <h4>🏛️ Governance</h4>
            <p>Participate in platform decisions through token voting</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 