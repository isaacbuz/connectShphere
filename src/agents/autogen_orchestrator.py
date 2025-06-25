"""
AutoGen Multi-Agent Orchestration for Starling.ai
Coordinates multiple agents for complex tasks
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional, Union

from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager
from autogen.agentchat.contrib.capabilities import context_handling
import autogen
from autogen.agentchat.contrib.text_analyzer_agent import TextAnalyzerAgent
from langchain.schema import HumanMessage, AIMessage
from langchain_openai import ChatOpenAI
import redis
from pymongo import MongoClient

from .base_agent import BaseAgent, AgentConfig
from .content_moderation_agent import ContentModerationAgent
from .personalization_agent import PersonalizationAgent

# Configure logging
logger = logging.getLogger(__name__)


class AutoGenOrchestrator(BaseAgent):
    """
    Orchestrates multiple AI agents using AutoGen framework for complex tasks
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.agents: Dict[str, Any] = {}
        self.group_chat: Optional[GroupChat] = None
        self.chat_manager: Optional[GroupChatManager] = None
        self.redis_client = redis.Redis(
            host=config.get('redis_host', 'localhost'),
            port=config.get('redis_port', 6379),
            db=config.get('redis_db', 0)
        )
        self.mongo_client = MongoClient(config.get('mongo_uri', 'mongodb://localhost:27017'))
        self.db = self.mongo_client[config.get('mongo_db', 'starling_ai')]
        
        self._initialize_agents()
        self._setup_group_chat()
    
    def _initialize_agents(self):
        """Initialize all AutoGen agents"""
        try:
            # Content Moderation Agent
            self.agents['moderator'] = AssistantAgent(
                name="ContentModerator",
                system_message="""You are a content moderation specialist. Your role is to:
                1. Analyze content for harmful, inappropriate, or spam content
                2. Check for hate speech, violence, or illegal content
                3. Assess content quality and relevance
                4. Provide moderation scores and recommendations
                5. Flag content that needs human review
                
                Always provide detailed reasoning for your decisions.""",
                llm_config=self._get_llm_config()
            )
            
            # Personalization Agent
            self.agents['personalizer'] = AssistantAgent(
                name="PersonalizationEngine",
                system_message="""You are a personalization specialist. Your role is to:
                1. Analyze user preferences and behavior patterns
                2. Recommend relevant content and connections
                3. Suggest content improvements for better engagement
                4. Identify trending topics and interests
                5. Provide personalized content curation
                
                Focus on user engagement and satisfaction.""",
                llm_config=self._get_llm_config()
            )
            
            # Content Generator Agent
            self.agents['generator'] = AssistantAgent(
                name="ContentGenerator",
                system_message="""You are a creative content generator. Your role is to:
                1. Generate engaging and relevant content suggestions
                2. Create content based on user prompts and context
                3. Adapt content style to match user preferences
                4. Ensure content is original and high-quality
                5. Provide multiple content options when requested
                
                Always maintain authenticity and user voice.""",
                llm_config=self._get_llm_config()
            )
            
            # Text Analyzer Agent
            self.agents['analyzer'] = TextAnalyzerAgent(
                name="TextAnalyzer",
                system_message="""You are a text analysis specialist. Your role is to:
                1. Analyze text sentiment and emotional tone
                2. Extract key topics and themes
                3. Identify language and cultural context
                4. Assess readability and complexity
                5. Detect AI-generated vs human content
                
                Provide detailed analysis with confidence scores.""",
                llm_config=self._get_llm_config()
            )
            
            # User Proxy Agent
            self.agents['user_proxy'] = UserProxyAgent(
                name="UserProxy",
                human_input_mode="NEVER",
                max_consecutive_auto_reply=10,
                is_termination_msg=lambda x: x.get("content", "").rstrip().endswith("TERMINATE"),
                code_execution_config={"work_dir": "workspace"},
                llm_config=self._get_llm_config()
            )
            
            logger.info("All AutoGen agents initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing AutoGen agents: {e}")
            raise
    
    def _setup_group_chat(self):
        """Setup group chat for multi-agent collaboration"""
        try:
            agent_list = [
                self.agents['user_proxy'],
                self.agents['moderator'],
                self.agents['personalizer'],
                self.agents['generator'],
                self.agents['analyzer']
            ]
            
            self.group_chat = GroupChat(
                agents=agent_list,
                messages=[],
                max_round=50
            )
            
            self.chat_manager = GroupChatManager(
                groupchat=self.group_chat,
                llm_config=self._get_llm_config()
            )
            
            logger.info("Group chat setup completed")
            
        except Exception as e:
            logger.error(f"Error setting up group chat: {e}")
            raise
    
    def _get_llm_config(self) -> Dict[str, Any]:
        """Get LLM configuration for AutoGen agents"""
        return {
            "config_list": [{
                "model": self.config.get('openai_model', 'gpt-4'),
                "api_key": self.config.get('openai_api_key')
            }],
            "temperature": 0.7,
            "max_tokens": 2000
        }
    
    async def moderate_content(self, content: str, user_id: str) -> Dict[str, Any]:
        """Moderate content using the moderation agent"""
        try:
            task = f"""
            Please moderate the following content for user {user_id}:
            
            Content: {content}
            
            Please provide:
            1. Moderation status (APPROVED/REJECTED/FLAGGED)
            2. Moderation score (0-100)
            3. Detailed reasoning
            4. Specific issues found (if any)
            5. Recommendations for improvement
            
            Format your response as JSON.
            """
            
            response = await self._run_agent_task('moderator', task)
            return self._parse_moderation_response(response)
            
        except Exception as e:
            logger.error(f"Error in content moderation: {e}")
            return {
                'status': 'ERROR',
                'score': 0,
                'reasoning': f'Moderation failed: {str(e)}',
                'issues': [],
                'recommendations': []
            }
    
    async def personalize_content(self, user_id: str, content_type: str = 'feed') -> Dict[str, Any]:
        """Generate personalized content recommendations"""
        try:
            # Get user data from database
            user_data = await self._get_user_data(user_id)
            
            task = f"""
            Generate personalized content recommendations for user {user_id}.
            
            User Profile:
            - Interests: {user_data.get('interests', [])}
            - Activity Level: {user_data.get('activity_level', 'medium')}
            - Preferred Content Types: {user_data.get('content_preferences', [])}
            
            Content Type: {content_type}
            
            Please provide:
            1. Recommended content topics
            2. Suggested content creators to follow
            3. Trending topics relevant to user
            4. Content engagement strategies
            5. Personalization score (0-100)
            
            Format your response as JSON.
            """
            
            response = await self._run_agent_task('personalizer', task)
            return self._parse_personalization_response(response)
            
        except Exception as e:
            logger.error(f"Error in content personalization: {e}")
            return {
                'topics': [],
                'creators': [],
                'trending': [],
                'strategies': [],
                'score': 0
            }
    
    async def generate_content(self, prompt: str, user_id: str, content_type: str = 'post') -> Dict[str, Any]:
        """Generate content using the generator agent"""
        try:
            user_data = await self._get_user_data(user_id)
            
            task = f"""
            Generate {content_type} content for user {user_id}.
            
            User Style:
            - Writing Style: {user_data.get('writing_style', 'casual')}
            - Tone: {user_data.get('tone', 'friendly')}
            - Interests: {user_data.get('interests', [])}
            
            Prompt: {prompt}
            Content Type: {content_type}
            
            Please provide:
            1. Generated content
            2. Alternative versions (2-3 options)
            3. Content quality score (0-100)
            4. Engagement potential score (0-100)
            5. Suggested hashtags and tags
            
            Format your response as JSON.
            """
            
            response = await self._run_agent_task('generator', task)
            return self._parse_generation_response(response)
            
        except Exception as e:
            logger.error(f"Error in content generation: {e}")
            return {
                'content': '',
                'alternatives': [],
                'quality_score': 0,
                'engagement_score': 0,
                'hashtags': []
            }
    
    async def analyze_text(self, text: str) -> Dict[str, Any]:
        """Analyze text using the analyzer agent"""
        try:
            task = f"""
            Analyze the following text:
            
            Text: {text}
            
            Please provide:
            1. Sentiment analysis (positive/negative/neutral with confidence)
            2. Key topics and themes
            3. Language detection
            4. Readability score
            5. AI-generated content probability
            6. Cultural context and sensitivity
            
            Format your response as JSON.
            """
            
            response = await self._run_agent_task('analyzer', task)
            return self._parse_analysis_response(response)
            
        except Exception as e:
            logger.error(f"Error in text analysis: {e}")
            return {
                'sentiment': {'label': 'neutral', 'confidence': 0},
                'topics': [],
                'language': 'unknown',
                'readability': 0,
                'ai_probability': 0,
                'cultural_context': {}
            }
    
    async def _run_agent_task(self, agent_name: str, task: str) -> str:
        """Run a task with a specific agent"""
        try:
            agent = self.agents[agent_name]
            response = await agent.a_generate_reply(
                messages=[{"role": "user", "content": task}],
                sender=self.agents['user_proxy']
            )
            return response.content
            
        except Exception as e:
            logger.error(f"Error running agent task: {e}")
            raise
    
    async def _get_user_data(self, user_id: str) -> Dict[str, Any]:
        """Get user data from database"""
        try:
            user_collection = self.db.users
            user_data = await user_collection.find_one({'_id': user_id})
            return user_data or {}
        except Exception as e:
            logger.error(f"Error getting user data: {e}")
            return {}
    
    def _parse_moderation_response(self, response: str) -> Dict[str, Any]:
        """Parse moderation agent response"""
        try:
            # Try to parse JSON response
            if '{' in response and '}' in response:
                start = response.find('{')
                end = response.rfind('}') + 1
                json_str = response[start:end]
                return json.loads(json_str)
            
            # Fallback parsing
            return {
                'status': 'FLAGGED' if any(word in response.lower() for word in ['inappropriate', 'harmful', 'spam']) else 'APPROVED',
                'score': 50,
                'reasoning': response,
                'issues': [],
                'recommendations': []
            }
        except Exception as e:
            logger.error(f"Error parsing moderation response: {e}")
            return {
                'status': 'ERROR',
                'score': 0,
                'reasoning': response,
                'issues': [],
                'recommendations': []
            }
    
    def _parse_personalization_response(self, response: str) -> Dict[str, Any]:
        """Parse personalization agent response"""
        try:
            if '{' in response and '}' in response:
                start = response.find('{')
                end = response.rfind('}') + 1
                json_str = response[start:end]
                return json.loads(json_str)
            
            return {
                'topics': [],
                'creators': [],
                'trending': [],
                'strategies': [],
                'score': 50
            }
        except Exception as e:
            logger.error(f"Error parsing personalization response: {e}")
            return {
                'topics': [],
                'creators': [],
                'trending': [],
                'strategies': [],
                'score': 0
            }
    
    def _parse_generation_response(self, response: str) -> Dict[str, Any]:
        """Parse content generation response"""
        try:
            if '{' in response and '}' in response:
                start = response.find('{')
                end = response.rfind('}') + 1
                json_str = response[start:end]
                return json.loads(json_str)
            
            return {
                'content': response,
                'alternatives': [],
                'quality_score': 50,
                'engagement_score': 50,
                'hashtags': []
            }
        except Exception as e:
            logger.error(f"Error parsing generation response: {e}")
            return {
                'content': response,
                'alternatives': [],
                'quality_score': 0,
                'engagement_score': 0,
                'hashtags': []
            }
    
    def _parse_analysis_response(self, response: str) -> Dict[str, Any]:
        """Parse text analysis response"""
        try:
            if '{' in response and '}' in response:
                start = response.find('{')
                end = response.rfind('}') + 1
                json_str = response[start:end]
                return json.loads(json_str)
            
            return {
                'sentiment': {'label': 'neutral', 'confidence': 0},
                'topics': [],
                'language': 'unknown',
                'readability': 0,
                'ai_probability': 0,
                'cultural_context': {}
            }
        except Exception as e:
            logger.error(f"Error parsing analysis response: {e}")
            return {
                'sentiment': {'label': 'neutral', 'confidence': 0},
                'topics': [],
                'language': 'unknown',
                'readability': 0,
                'ai_probability': 0,
                'cultural_context': {}
            }
    
    async def cleanup(self):
        """Cleanup resources"""
        try:
            if self.mongo_client:
                self.mongo_client.close()
            if self.redis_client:
                self.redis_client.close()
            logger.info("AutoGen orchestrator cleanup completed")
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")


# Import required modules
import os
from datetime import datetime 