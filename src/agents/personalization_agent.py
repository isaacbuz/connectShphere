"""
Personalization Agent for Starling.ai
Implements RAG-based personalized content recommendations
"""

import asyncio
import json
import logging
import os
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timedelta

import numpy as np
from langchain.tools import BaseTool
from langchain.callbacks.manager import CallbackManagerForToolRun
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Pinecone
from langchain.chains import RetrievalQA
from langchain.memory import VectorStoreRetrieverMemory
from llama_index import VectorStoreIndex, ServiceContext, Document
from llama_index.vector_stores import PineconeVectorStore
from pydantic import BaseModel, Field
import pinecone
from sentence_transformers import SentenceTransformer
import torch
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
import redis

from .base_agent import BaseAgent, AgentConfig, AgentMessage

# Configure logging
logger = logging.getLogger(__name__)


class UserProfile(BaseModel):
    """User profile for personalization"""
    user_id: str
    interests: List[str]
    interaction_history: List[Dict[str, Any]]
    preferences: Dict[str, Any]
    embedding: Optional[List[float]] = None
    last_updated: datetime = Field(default_factory=datetime.now)


class ContentRecommendation(BaseModel):
    """Content recommendation result"""
    content_id: str
    score: float
    reason: str
    category: str
    predicted_engagement: float


class VectorSearchTool(BaseTool):
    """Tool for semantic vector search"""
    name = "vector_search"
    description = "Search for semantically similar content using vector embeddings"
    
    def __init__(self):
        super().__init__()
        # Initialize Pinecone
        pinecone.init(
            api_key=os.getenv("PINECONE_API_KEY"),
            environment=os.getenv("PINECONE_ENV", "us-west4-gcp")
        )
        
        # Initialize embeddings
        self.embeddings = OpenAIEmbeddings()
        self.index_name = "starling_ai-content"
        
        # Create index if it doesn't exist
        if self.index_name not in pinecone.list_indexes():
            pinecone.create_index(
                self.index_name,
                dimension=1536,  # OpenAI embeddings dimension
                metric='cosine'
            )
        
        self.index = pinecone.Index(self.index_name)
    
    def _run(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        top_k: int = 10,
        run_manager: Optional[CallbackManagerForToolRun] = None
    ) -> str:
        """Run vector search"""
        try:
            # Generate query embedding
            query_embedding = self.embeddings.embed_query(query)
            
            # Search in Pinecone
            results = self.index.query(
                vector=query_embedding,
                filter=filters,
                top_k=top_k,
                include_metadata=True
            )
            
            # Format results
            formatted_results = []
            for match in results['matches']:
                formatted_results.append({
                    'id': match['id'],
                    'score': float(match['score']),
                    'metadata': match.get('metadata', {})
                })
            
            return json.dumps(formatted_results)
        except Exception as e:
            logger.error(f"Vector search error: {e}")
            return json.dumps({"error": str(e), "results": []})
    
    async def _arun(self, query: str, filters: Optional[Dict[str, Any]] = None, top_k: int = 10) -> str:
        """Async version"""
        return self._run(query, filters, top_k)


class UserProfilerTool(BaseTool):
    """Tool for analyzing and updating user profiles"""
    name = "user_profiler"
    description = "Analyze user behavior and update user profiles"
    
    def __init__(self):
        super().__init__()
        # Initialize sentence transformer for user embeddings
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.redis_client = redis.Redis(host='redis', port=6379, decode_responses=True)
    
    def _run(
        self,
        user_id: str,
        recent_interactions: List[Dict[str, Any]],
        run_manager: Optional[CallbackManagerForToolRun] = None
    ) -> str:
        """Analyze user and create/update profile"""
        try:
            # Get existing profile or create new
            profile_key = f"user_profile:{user_id}"
            existing_profile = self.redis_client.get(profile_key)
            
            if existing_profile:
                profile = UserProfile(**json.loads(existing_profile))
            else:
                profile = UserProfile(user_id=user_id, interests=[], interaction_history=[], preferences={})
            
            # Update interaction history
            profile.interaction_history.extend(recent_interactions)
            profile.interaction_history = profile.interaction_history[-100:]  # Keep last 100
            
            # Extract interests from interactions
            interests = self._extract_interests(recent_interactions)
            profile.interests = list(set(profile.interests + interests))[-20:]  # Keep top 20
            
            # Update preferences based on behavior
            profile.preferences = self._analyze_preferences(profile.interaction_history)
            
            # Generate user embedding
            interest_text = " ".join(profile.interests)
            profile.embedding = self.model.encode(interest_text).tolist()
            
            # Save profile
            profile.last_updated = datetime.now()
            self.redis_client.setex(
                profile_key,
                86400 * 7,  # TTL: 7 days
                json.dumps(profile.dict(), default=str)
            )
            
            return json.dumps({
                "user_id": user_id,
                "interests": profile.interests,
                "preferences": profile.preferences,
                "profile_updated": True
            })
        except Exception as e:
            logger.error(f"User profiling error: {e}")
            return json.dumps({"error": str(e), "profile_updated": False})
    
    def _extract_interests(self, interactions: List[Dict[str, Any]]) -> List[str]:
        """Extract user interests from interactions"""
        interests = []
        for interaction in interactions:
            # Extract from content categories
            if 'categories' in interaction:
                interests.extend(interaction['categories'])
            # Extract from content tags
            if 'tags' in interaction:
                interests.extend(interaction['tags'])
        return list(set(interests))
    
    def _analyze_preferences(self, history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze user preferences from interaction history"""
        preferences = {
            "preferred_categories": {},
            "engagement_times": {},
            "content_length_preference": "medium",
            "interaction_frequency": "regular"
        }
        
        # Analyze categories
        category_counts = {}
        for interaction in history:
            for category in interaction.get('categories', []):
                category_counts[category] = category_counts.get(category, 0) + 1
        
        # Sort categories by frequency
        sorted_categories = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)
        preferences["preferred_categories"] = dict(sorted_categories[:5])
        
        return preferences
    
    async def _arun(self, user_id: str, recent_interactions: List[Dict[str, Any]]) -> str:
        """Async version"""
        return self._run(user_id, recent_interactions)


class PersonalizationAgent(BaseAgent):
    """Agent responsible for personalized content recommendations"""
    
    def __init__(self):
        config = AgentConfig(
            name="PersonalizationEngine",
            role="Personalized Content Recommendation Specialist",
            model="gpt-4-turbo",
            temperature=0.7,
            tools=[
                VectorSearchTool,
                UserProfilerTool
            ]
        )
        super().__init__(config)
        
        # Initialize RAG components
        self._init_rag_system()
    
    def _init_rag_system(self):
        """Initialize RAG (Retrieval Augmented Generation) system"""
        # Initialize vector store for RAG
        self.rag_embeddings = OpenAIEmbeddings()
        
        # Initialize Pinecone for RAG
        pinecone.init(
            api_key=os.getenv("PINECONE_API_KEY"),
            environment=os.getenv("PINECONE_ENV", "us-west4-gcp")
        )
        
        self.rag_index_name = "starling_ai-rag"
        if self.rag_index_name not in pinecone.list_indexes():
            pinecone.create_index(
                self.rag_index_name,
                dimension=1536,
                metric='cosine'
            )
    
    def _get_responsibilities(self) -> str:
        """Get agent-specific responsibilities"""
        return """
        1. Build and maintain user profiles based on interaction history
        2. Generate personalized content recommendations using RAG
        3. Implement collaborative and content-based filtering
        4. Continuously improve recommendation accuracy
        5. Explain recommendations to users
        6. Balance personalization with content diversity
        7. Respect user privacy while maximizing relevance
        8. A/B test recommendation strategies
        """
    
    async def generate_feed(self, user_id: str, page_size: int = 20) -> List[ContentRecommendation]:
        """Generate personalized feed for a user"""
        # Use agent executor to generate recommendations
        prompt = f"""
        Generate a personalized content feed for user {user_id}.
        
        Requirements:
        1. Use the vector search tool to find relevant content
        2. Use the user profiler to understand user preferences
        3. Ensure diversity in content categories
        4. Balance between user preferences and discovery
        
        Return {page_size} recommendations with scores and explanations.
        """
        
        result = await self.process_task(prompt)
        
        # For now, return mock recommendations
        # In production, this would parse the actual results
        recommendations = []
        for i in range(min(page_size, 5)):
            recommendations.append(ContentRecommendation(
                content_id=f"content_{i}",
                score=0.8 - i * 0.1,
                reason="Based on your interests",
                category="technology",
                predicted_engagement=0.7
            ))
        
        return recommendations
    
    async def _handle_message(self, message: AgentMessage) -> Optional[Dict[str, Any]]:
        """Handle incoming messages from other agents"""
        if message.message_type == "generate_recommendations":
            user_id = message.content.get("user_id")
            count = message.content.get("count", 10)
            
            recommendations = await self.generate_feed(user_id, count)
            return {
                "recommendations": [rec.dict() for rec in recommendations],
                "generated_at": datetime.now().isoformat()
            }
        
        return None 