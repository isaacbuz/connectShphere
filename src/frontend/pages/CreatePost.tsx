import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { useAI } from '../contexts/AIContext';

const CreatePost: React.FC = () => {
  const navigate = useNavigate();
  const { account } = useWeb3();
  const { isAIActive, getSuggestions, aiSuggestions } = useAI();
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  const handleContentChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    // Get AI suggestions if enabled
    if (isAIActive && newContent.length > 10) {
      await getSuggestions(newContent);
    }
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !account) return;

    try {
      setIsPosting(true);
      
      // TODO: Implement actual post creation API
      const formData = new FormData();
      formData.append('content', content);
      if (mediaFile) {
        formData.append('media', mediaFile);
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Navigate back to home after successful post
      navigate('/');
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const applySuggestion = (suggestion: string) => {
    setContent(content + ' ' + suggestion);
  };

  if (!account) {
    return (
      <div className="create-post-error">
        <h2>Please connect your wallet to create posts</h2>
        <button onClick={() => navigate('/')}>Go Home</button>
      </div>
    );
  }

  return (
    <div className="create-post-page">
      <div className="create-post-container">
        <h1>Create New Post</h1>
        
        <form onSubmit={handleSubmit} className="create-post-form">
          <div className="form-group">
            <textarea
              value={content}
              onChange={handleContentChange}
              placeholder="What's on your mind?"
              className="post-textarea"
              maxLength={500}
              required
            />
            <div className="char-count">
              {content.length}/500
            </div>
          </div>

          {isAIActive && aiSuggestions.length > 0 && (
            <div className="ai-suggestions">
              <h3>AI Suggestions:</h3>
              <div className="suggestions-list">
                {aiSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    className="suggestion-chip"
                    onClick={() => applySuggestion(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="media-upload" className="media-upload-label">
              <span>📷 Add Photo/Video</span>
              <input
                id="media-upload"
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaUpload}
                className="media-upload-input"
              />
            </label>
            
            {mediaPreview && (
              <div className="media-preview">
                <img src={mediaPreview} alt="Preview" />
                <button
                  type="button"
                  onClick={() => {
                    setMediaFile(null);
                    setMediaPreview(null);
                  }}
                  className="remove-media"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="cancel-btn"
              disabled={isPosting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="post-btn"
              disabled={isPosting || !content.trim()}
            >
              {isPosting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePost; 