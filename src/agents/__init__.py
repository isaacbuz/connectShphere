"""
Starling.ai AI Agents Module
Exports all agent classes and orchestration components
"""

from .base_agent import BaseAgent, AgentConfig, AgentMessage
from .content_moderation_agent import ContentModerationAgent, ContentAnalysis
from .personalization_agent import PersonalizationAgent, ContentRecommendation, UserProfile
from .autogen_orchestrator import Starling.aiOrchestrator

__all__ = [
    'BaseAgent',
    'AgentConfig',
    'AgentMessage',
    'ContentModerationAgent',
    'ContentAnalysis',
    'PersonalizationAgent',
    'ContentRecommendation',
    'UserProfile',
    'Starling.aiOrchestrator'
]

# Version
__version__ = '1.0.0' 