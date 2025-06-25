"""
Content Moderation Agent for ConnectSphere
Handles content safety, toxicity detection, and fact-checking
"""

import asyncio
import json
import logging
import os
from typing import Any, Dict, List, Optional

import numpy as np
from langchain.tools import BaseTool, tool
from langchain.callbacks.manager import CallbackManagerForToolRun
from pydantic import BaseModel, Field
import requests
from transformers import pipeline
import torch

from .base_agent import BaseAgent, AgentConfig, AgentMessage

# Configure logging
logger = logging.getLogger(__name__)


class ContentAnalysis(BaseModel):
    """Content analysis results"""
    content_id: str
    toxicity_score: float
    hate_speech_detected: bool
    misinformation_score: float
    nsfw_detected: bool
    sentiment: str
    categories: List[str]
    action: str  # "approve", "flag", "reject"
    reasoning: str


class ToxicityDetectionTool(BaseTool):
    """Tool for detecting toxic content"""
    name = "toxicity_detector"
    description = "Detect toxicity, hate speech, and harmful content"
    
    def __init__(self):
        super().__init__()
        # Initialize toxicity detection model
        self.classifier = pipeline(
            "text-classification",
            model="unitary/toxic-bert",
            device=0 if torch.cuda.is_available() else -1
        )
        
        # Perspective API client (Google's toxicity API)
        self.perspective_api_key = os.getenv("PERSPECTIVE_API_KEY")
    
    def _run(
        self,
        text: str,
        run_manager: Optional[CallbackManagerForToolRun] = None
    ) -> str:
        """Run toxicity detection on text"""
        try:
            # Local model prediction
            local_results = self.classifier(text)
            
            # Perspective API call (if available)
            perspective_score = 0.0
            if self.perspective_api_key:
                perspective_score = self._get_perspective_score(text)
            
            # Combine scores
            toxicity_score = max(
                local_results[0]['score'] if local_results[0]['label'] == 'TOXIC' else 0,
                perspective_score
            )
            
            return json.dumps({
                "toxicity_score": toxicity_score,
                "toxic": toxicity_score > 0.7,
                "local_results": local_results,
                "perspective_score": perspective_score
            })
        except Exception as e:
            return json.dumps({"error": str(e), "toxicity_score": 0.0})
    
    def _get_perspective_score(self, text: str) -> float:
        """Get toxicity score from Perspective API"""
        url = "https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze"
        
        payload = {
            'comment': {'text': text},
            'requestedAttributes': {
                'TOXICITY': {},
                'SEVERE_TOXICITY': {},
                'IDENTITY_ATTACK': {},
                'THREAT': {}
            }
        }
        
        response = requests.post(
            url,
            params={'key': self.perspective_api_key},
            json=payload
        )
        
        if response.status_code == 200:
            scores = response.json()['attributeScores']
            return max(
                scores['TOXICITY']['summaryScore']['value'],
                scores['SEVERE_TOXICITY']['summaryScore']['value']
            )
        return 0.0
    
    async def _arun(self, text: str) -> str:
        """Async version"""
        return self._run(text)


class FactCheckingTool(BaseTool):
    """Tool for fact-checking content"""
    name = "fact_checker"
    description = "Check claims for misinformation and verify facts"
    
    def __init__(self):
        super().__init__()
        # Initialize fact-checking model
        self.fact_checker = pipeline(
            "text-classification",
            model="microsoft/deberta-v3-base-tasksource-nli",
            device=0 if torch.cuda.is_available() else -1
        )
    
    def _run(
        self,
        claim: str,
        run_manager: Optional[CallbackManagerForToolRun] = None
    ) -> str:
        """Run fact-checking on a claim"""
        try:
            # Check against known fact databases
            # This is a simplified version - in production, you'd use
            # APIs like ClaimBuster, FactCheck.org, Snopes, etc.
            
            # Use NLI model for basic fact verification
            test_facts = [
                "The Earth is round",
                "COVID-19 vaccines are safe and effective",
                "Climate change is real and human-caused"
            ]
            
            results = []
            for fact in test_facts:
                result = self.fact_checker(f"{claim} [SEP] {fact}")
                if result[0]['label'] == 'CONTRADICTION':
                    results.append({
                        "contradicts": fact,
                        "confidence": result[0]['score']
                    })
            
            misinformation_score = max([r['confidence'] for r in results]) if results else 0.0
            
            return json.dumps({
                "misinformation_score": misinformation_score,
                "contradictions": results,
                "needs_review": misinformation_score > 0.6
            })
        except Exception as e:
            return json.dumps({"error": str(e), "misinformation_score": 0.0})
    
    async def _arun(self, claim: str) -> str:
        """Async version"""
        return self._run(claim)


class NSFWDetectionTool(BaseTool):
    """Tool for detecting NSFW content"""
    name = "nsfw_detector"
    description = "Detect not-safe-for-work content in text and metadata"
    
    def __init__(self):
        super().__init__()
        # Initialize NSFW detection model
        self.classifier = pipeline(
            "text-classification",
            model="michellejieli/NSFW_text_classifier",
            device=0 if torch.cuda.is_available() else -1
        )
    
    def _run(
        self,
        text: str,
        run_manager: Optional[CallbackManagerForToolRun] = None
    ) -> str:
        """Run NSFW detection on text"""
        try:
            results = self.classifier(text)
            nsfw_score = results[0]['score'] if results[0]['label'] == 'NSFW' else 0.0
            
            return json.dumps({
                "nsfw_score": nsfw_score,
                "nsfw_detected": nsfw_score > 0.8,
                "classification": results[0]['label']
            })
        except Exception as e:
            return json.dumps({"error": str(e), "nsfw_score": 0.0})
    
    async def _arun(self, text: str) -> str:
        """Async version"""
        return self._run(text)


class ContentModerationAgent(BaseAgent):
    """Agent responsible for content moderation and safety"""
    
    def __init__(self):
        config = AgentConfig(
            name="ContentModerator",
            role="Content Safety and Moderation Specialist",
            model="gpt-4-turbo",
            temperature=0.3,  # Lower temperature for consistent moderation
            tools=[
                ToxicityDetectionTool,
                FactCheckingTool,
                NSFWDetectionTool
            ]
        )
        super().__init__(config)
        
        # Initialize moderation thresholds
        self.thresholds = {
            "toxicity": 0.7,
            "hate_speech": 0.8,
            "misinformation": 0.6,
            "nsfw": 0.8
        }
        
        # Start periodic model updates
        asyncio.create_task(self._update_models_periodically())
    
    def _get_responsibilities(self) -> str:
        """Get agent-specific responsibilities"""
        return """
        1. Analyze all user-generated content for safety and compliance
        2. Detect and filter toxic, hateful, or harmful content
        3. Identify misinformation and fact-check claims
        4. Flag NSFW content appropriately
        5. Provide clear reasoning for moderation decisions
        6. Collaborate with other agents to ensure platform safety
        7. Maintain high accuracy while minimizing false positives
        8. Adapt to new types of harmful content
        """
    
    async def analyze_content(self, content: Dict[str, Any]) -> ContentAnalysis:
        """Analyze content for moderation"""
        content_id = content.get("id", "unknown")
        text = content.get("text", "")
        
        # Use agent executor to analyze content
        analysis_prompt = f"""
        Analyze the following content for moderation:
        
        Content: {text}
        
        Use all available tools to:
        1. Check for toxicity and hate speech
        2. Verify facts and check for misinformation
        3. Detect NSFW content
        4. Determine the appropriate action (approve/flag/reject)
        
        Provide detailed reasoning for your decision.
        """
        
        result = await self.process_task(analysis_prompt)
        
        # Parse the result and create ContentAnalysis
        try:
            # Extract scores from tool outputs
            toxicity_data = json.loads(
                await self.tools[0]._arun(text)  # ToxicityDetectionTool
            )
            fact_data = json.loads(
                await self.tools[1]._arun(text)  # FactCheckingTool
            )
            nsfw_data = json.loads(
                await self.tools[2]._arun(text)  # NSFWDetectionTool
            )
            
            # Determine action based on scores
            action = "approve"
            if (toxicity_data.get("toxicity_score", 0) > self.thresholds["toxicity"] or
                fact_data.get("misinformation_score", 0) > self.thresholds["misinformation"] or
                nsfw_data.get("nsfw_detected", False)):
                action = "reject"
            elif (toxicity_data.get("toxicity_score", 0) > 0.5 or
                  fact_data.get("needs_review", False)):
                action = "flag"
            
            analysis = ContentAnalysis(
                content_id=content_id,
                toxicity_score=toxicity_data.get("toxicity_score", 0.0),
                hate_speech_detected=toxicity_data.get("toxic", False),
                misinformation_score=fact_data.get("misinformation_score", 0.0),
                nsfw_detected=nsfw_data.get("nsfw_detected", False),
                sentiment=self._analyze_sentiment(text),
                categories=self._categorize_content(text),
                action=action,
                reasoning=result
            )
            
            # Log the analysis
            self._log_metrics({
                "agent": self.name,
                "action": "content_analysis",
                "content_id": content_id,
                "result": action,
                "scores": {
                    "toxicity": analysis.toxicity_score,
                    "misinformation": analysis.misinformation_score,
                    "nsfw": float(analysis.nsfw_detected)
                }
            })
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing content: {e}")
            return ContentAnalysis(
                content_id=content_id,
                toxicity_score=0.0,
                hate_speech_detected=False,
                misinformation_score=0.0,
                nsfw_detected=False,
                sentiment="neutral",
                categories=[],
                action="flag",
                reasoning=f"Error during analysis: {str(e)}"
            )
    
    def _analyze_sentiment(self, text: str) -> str:
        """Analyze sentiment of text"""
        # Simple sentiment analysis - in production, use a proper model
        positive_words = ["good", "great", "excellent", "amazing", "wonderful"]
        negative_words = ["bad", "terrible", "awful", "horrible", "disgusting"]
        
        text_lower = text.lower()
        positive_count = sum(word in text_lower for word in positive_words)
        negative_count = sum(word in text_lower for word in negative_words)
        
        if positive_count > negative_count:
            return "positive"
        elif negative_count > positive_count:
            return "negative"
        return "neutral"
    
    def _categorize_content(self, text: str) -> List[str]:
        """Categorize content into topics"""
        # Simple categorization - in production, use a proper classifier
        categories = []
        
        category_keywords = {
            "politics": ["election", "president", "government", "policy"],
            "technology": ["AI", "software", "computer", "internet"],
            "health": ["medical", "doctor", "health", "disease"],
            "sports": ["game", "player", "team", "score"],
            "entertainment": ["movie", "music", "show", "celebrity"]
        }
        
        text_lower = text.lower()
        for category, keywords in category_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                categories.append(category)
        
        return categories if categories else ["general"]
    
    async def _handle_message(self, message: AgentMessage) -> Optional[Dict[str, Any]]:
        """Handle incoming messages from other agents"""
        if message.message_type == "moderate_content":
            analysis = await self.analyze_content(message.content)
            return analysis.dict()
        
        elif message.message_type == "update_thresholds":
            # Update moderation thresholds
            new_thresholds = message.content.get("thresholds", {})
            self.thresholds.update(new_thresholds)
            return {"status": "thresholds_updated", "new_thresholds": self.thresholds}
        
        elif message.message_type == "get_statistics":
            # Return moderation statistics
            # In production, this would query a database
            return {
                "total_analyzed": 10000,
                "approved": 8500,
                "flagged": 1000,
                "rejected": 500,
                "average_toxicity": 0.15
            }
        
        return None
    
    async def _update_models_periodically(self):
        """Periodically update ML models"""
        while True:
            try:
                # Wait 24 hours between updates
                await asyncio.sleep(86400)
                
                # Check for model updates
                # In production, this would download new model weights
                logger.info("Checking for model updates...")
                
                # Retrain on new data if available
                # This is a placeholder - implement actual retraining logic
                
            except Exception as e:
                logger.error(f"Error updating models: {e}") 