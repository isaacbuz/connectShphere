import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';

interface ProfileData {
  username: string;
  bio: string;
  avatar: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  joinedDate: string;
}

const Profile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { account } = useWeb3();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      // TODO: Replace with actual API call
      const mockProfile: ProfileData = {
        username: userId || 'user123',
        bio: 'AI enthusiast, blockchain developer, and social media innovator.',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
        followersCount: 1234,
        followingCount: 567,
        postsCount: 89,
        joinedDate: '2024-01-15'
      };
      setProfile(mockProfile);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      // TODO: Implement follow/unfollow API
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-error">
        <h2>Profile not found</h2>
        <button onClick={() => navigate('/')}>Go Home</button>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <img src={profile.avatar} alt={profile.username} className="profile-avatar" />
        <div className="profile-info">
          <h1>{profile.username}</h1>
          <p className="profile-bio">{profile.bio}</p>
          <div className="profile-stats">
            <div className="stat">
              <strong>{profile.postsCount}</strong>
              <span>Posts</span>
            </div>
            <div className="stat">
              <strong>{profile.followersCount}</strong>
              <span>Followers</span>
            </div>
            <div className="stat">
              <strong>{profile.followingCount}</strong>
              <span>Following</span>
            </div>
          </div>
          <p className="profile-joined">Joined {new Date(profile.joinedDate).toLocaleDateString()}</p>
          {account && account !== userId && (
            <button 
              className={`follow-btn ${isFollowing ? 'following' : ''}`}
              onClick={handleFollow}
            >
              {isFollowing ? 'Unfollow' : 'Follow'}
            </button>
          )}
        </div>
      </div>

      <div className="profile-tabs">
        <button className="tab active">Posts</button>
        <button className="tab">Media</button>
        <button className="tab">Likes</button>
      </div>

      <div className="profile-content">
        <p>User posts will appear here...</p>
      </div>
    </div>
  );
};

export default Profile; 