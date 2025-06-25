"""
AutoGen Multi-Agent Orchestration for ConnectSphere
Coordinates multiple agents for complex tasks
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional, Union

from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager
from autogen.agentchat.contrib.capabilities import context_handling
import autogen

from .base_agent import BaseAgent, AgentConfig
from .content_moderation_agent import ContentModerationAgent
from .personalization_agent import PersonalizationAgent

# Configure logging
logger = logging.getLogger(__name__)


class ConnectSphereOrchestrator:
    """Orchestrates multiple agents using AutoGen framework"""
    
    def __init__(self):
        # Initialize configuration
        self.config_list = [
            {
                "model": "gpt-4-turbo",
                "api_key": os.getenv("OPENAI_API_KEY"),
            },
            {
                "model": "claude-3-opus",
                "api_key": os.getenv("ANTHROPIC_API_KEY"),
                "api_type": "anthropic"
            }
        ]
        
        # Initialize specialized agents
        self.content_moderator = ContentModerationAgent()
        self.personalization_engine = PersonalizationAgent()
        
        # Initialize AutoGen agents
        self._init_autogen_agents()
        
        # Create group chat for agent collaboration
        self._init_group_chat()
        
        logger.info("ConnectSphere Orchestrator initialized")
    
    def _init_autogen_agents(self):
        """Initialize AutoGen assistant agents"""
        # Content Strategy Agent
        self.content_strategist = AssistantAgent(
            name="ContentStrategist",
            system_message="""You are a content strategy expert for ConnectSphere.
            Your role is to:
            1. Analyze content trends and user engagement
            2. Suggest content strategies for platform growth
            3. Coordinate with moderation and personalization agents
            4. Optimize content distribution and discovery
            """,
            llm_config={"config_list": self.config_list}
        )
        
        # User Experience Agent
        self.ux_agent = AssistantAgent(
            name="UXSpecialist",
            system_message="""You are a UX specialist for ConnectSphere.
            Your role is to:
            1. Analyze user behavior and feedback
            2. Suggest UI/UX improvements
            3. Optimize user journeys and flows
            4. Ensure accessibility and usability
            """,
            llm_config={"config_list": self.config_list}
        )
        
        # Economic Agent
        self.economic_agent = AssistantAgent(
            name="EconomicAnalyst",
            system_message="""You are an economic analyst for ConnectSphere.
            Your role is to:
            1. Analyze DOGE transaction patterns
            2. Optimize tokenomics and incentives
            3. Monitor platform economics
            4. Suggest revenue optimization strategies
            """,
            llm_config={"config_list": self.config_list}
        )
        
        # Governance Agent
        self.governance_agent = AssistantAgent(
            name="GovernanceCoordinator",
            system_message="""You are a governance coordinator for ConnectSphere.
            Your role is to:
            1. Manage DAO proposals and voting
            2. Ensure platform policies are followed
            3. Coordinate community governance
            4. Facilitate consensus building
            """,
            llm_config={"config_list": self.config_list}
        )
        
        # Safety Agent
        self.safety_agent = AssistantAgent(
            name="SafetyOfficer",
            system_message="""You are a safety officer for ConnectSphere.
            Your role is to:
            1. Monitor platform safety and security
            2. Coordinate with content moderation
            3. Identify and mitigate risks
            4. Ensure user protection
            """,
            llm_config={"config_list": self.config_list}
        )
        
        # User Proxy for human interaction
        self.user_proxy = UserProxyAgent(
            name="PlatformAdmin",
            system_message="Platform administrator who can execute actions.",
            code_execution_config={"use_docker": False},
            human_input_mode="NEVER",  # Automated for now
            max_consecutive_auto_reply=10
        )
    
    def _init_group_chat(self):
        """Initialize group chat for agent collaboration"""
        self.agents = [
            self.content_strategist,
            self.ux_agent,
            self.economic_agent,
            self.governance_agent,
            self.safety_agent,
            self.user_proxy
        ]
        
        self.group_chat = GroupChat(
            agents=self.agents,
            messages=[],
            max_round=20,
            speaker_selection_method="auto"
        )
        
        self.manager = GroupChatManager(
            groupchat=self.group_chat,
            llm_config={"config_list": self.config_list}
        )
    
    async def handle_complex_task(self, task: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle complex tasks requiring multiple agent collaboration"""
        try:
            # Add context to the task
            enhanced_task = f"""
            Task: {task}
            
            Context:
            - Platform metrics: {json.dumps(context.get('metrics', {}), indent=2)}
            - User data: {json.dumps(context.get('user_data', {}), indent=2)}
            - Current issues: {json.dumps(context.get('issues', []), indent=2)}
            
            Please collaborate to provide a comprehensive solution.
            """
            
            # Start the group chat
            self.user_proxy.initiate_chat(
                self.manager,
                message=enhanced_task
            )
            
            # Extract insights from the conversation
            insights = self._extract_insights(self.group_chat.messages)
            
            # Execute actions based on insights
            actions = await self._execute_actions(insights)
            
            return {
                "task": task,
                "insights": insights,
                "actions": actions,
                "conversation": self.group_chat.messages
            }
            
        except Exception as e:
            logger.error(f"Error handling complex task: {e}")
            return {"error": str(e)}
    
    def _extract_insights(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract key insights from agent conversation"""
        insights = {
            "content_strategy": [],
            "ux_improvements": [],
            "economic_recommendations": [],
            "governance_actions": [],
            "safety_concerns": []
        }
        
        for message in messages:
            sender = message.get("name", "")
            content = message.get("content", "")
            
            if sender == "ContentStrategist":
                insights["content_strategy"].append(content)
            elif sender == "UXSpecialist":
                insights["ux_improvements"].append(content)
            elif sender == "EconomicAnalyst":
                insights["economic_recommendations"].append(content)
            elif sender == "GovernanceCoordinator":
                insights["governance_actions"].append(content)
            elif sender == "SafetyOfficer":
                insights["safety_concerns"].append(content)
        
        return insights
    
    async def _execute_actions(self, insights: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Execute actions based on agent insights"""
        actions = []
        
        # Process safety concerns first
        for concern in insights.get("safety_concerns", []):
            if "content moderation" in concern.lower():
                # Trigger content moderation review
                action = {
                    "type": "content_moderation",
                    "status": "initiated",
                    "concern": concern
                }
                actions.append(action)
        
        # Process governance actions
        for governance_action in insights.get("governance_actions", []):
            if "proposal" in governance_action.lower():
                action = {
                    "type": "governance_proposal",
                    "status": "drafted",
                    "details": governance_action
                }
                actions.append(action)
        
        return actions
    
    async def optimize_platform_performance(self) -> Dict[str, Any]:
        """Run comprehensive platform optimization"""
        context = {
            "metrics": await self._gather_platform_metrics(),
            "user_data": await self._gather_user_data(),
            "issues": await self._identify_current_issues()
        }
        
        task = """
        Analyze the current platform state and provide recommendations for:
        1. Improving user engagement and retention
        2. Optimizing content quality and distribution
        3. Enhancing platform economics
        4. Strengthening governance and safety
        """
        
        return await self.handle_complex_task(task, context)
    
    async def handle_crisis_situation(self, crisis_type: str, details: Dict[str, Any]) -> Dict[str, Any]:
        """Handle crisis situations with coordinated agent response"""
        crisis_task = f"""
        URGENT: Crisis situation detected
        Type: {crisis_type}
        Details: {json.dumps(details, indent=2)}
        
        Required actions:
        1. Assess the situation and impact
        2. Propose immediate mitigation steps
        3. Plan long-term solutions
        4. Coordinate response across all platform areas
        """
        
        # Use a special crisis group chat with higher priority
        crisis_chat = GroupChat(
            agents=self.agents,
            messages=[],
            max_round=30,
            speaker_selection_method="round_robin"  # Ensure all agents contribute
        )
        
        crisis_manager = GroupChatManager(
            groupchat=crisis_chat,
            llm_config={"config_list": self.config_list}
        )
        
        self.user_proxy.initiate_chat(
            crisis_manager,
            message=crisis_task
        )
        
        response = {
            "crisis_type": crisis_type,
            "response_plan": self._extract_crisis_response(crisis_chat.messages),
            "immediate_actions": await self._execute_crisis_actions(crisis_chat.messages),
            "conversation": crisis_chat.messages
        }
        
        return response
    
    def _extract_crisis_response(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract crisis response plan from agent discussion"""
        response_plan = {
            "immediate_steps": [],
            "mitigation_strategies": [],
            "long_term_solutions": [],
            "risk_assessment": ""
        }
        
        # Analyze messages to extract response elements
        for message in messages:
            content = message.get("content", "").lower()
            
            if "immediate" in content or "urgent" in content:
                response_plan["immediate_steps"].append(message.get("content", ""))
            elif "mitigation" in content or "reduce" in content:
                response_plan["mitigation_strategies"].append(message.get("content", ""))
            elif "long-term" in content or "future" in content:
                response_plan["long_term_solutions"].append(message.get("content", ""))
            elif "risk" in content or "assessment" in content:
                response_plan["risk_assessment"] = message.get("content", "")
        
        return response_plan
    
    async def _execute_crisis_actions(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Execute immediate crisis response actions"""
        actions = []
        
        # Analyze messages for actionable items
        for message in messages:
            content = message.get("content", "").lower()
            
            if "suspend" in content or "pause" in content:
                actions.append({
                    "type": "suspension",
                    "target": "identified_in_message",
                    "status": "pending_execution"
                })
            elif "alert" in content or "notify" in content:
                actions.append({
                    "type": "notification",
                    "recipients": "all_users",
                    "status": "queued"
                })
            elif "moderate" in content or "review" in content:
                actions.append({
                    "type": "enhanced_moderation",
                    "status": "activated"
                })
        
        return actions
    
    async def _gather_platform_metrics(self) -> Dict[str, Any]:
        """Gather current platform metrics"""
        # In production, this would query real metrics
        return {
            "daily_active_users": 10000,
            "content_created": 5000,
            "transactions": 2500,
            "engagement_rate": 0.65
        }
    
    async def _gather_user_data(self) -> Dict[str, Any]:
        """Gather aggregated user data"""
        # In production, this would query real data
        return {
            "total_users": 50000,
            "new_users_today": 500,
            "retention_rate": 0.75,
            "average_session_duration": 1200  # seconds
        }
    
    async def _identify_current_issues(self) -> List[Dict[str, Any]]:
        """Identify current platform issues"""
        # In production, this would analyze real issues
        return [
            {
                "type": "performance",
                "severity": "medium",
                "description": "Increased latency in content loading"
            },
            {
                "type": "moderation",
                "severity": "low",
                "description": "Slight increase in spam content"
            }
        ]
    
    async def generate_daily_report(self) -> Dict[str, Any]:
        """Generate comprehensive daily platform report"""
        report_task = """
        Generate a comprehensive daily report covering:
        1. Platform health and performance
        2. User engagement and growth
        3. Content quality and moderation status
        4. Economic activity and trends
        5. Governance activities and proposals
        6. Safety and security status
        7. Recommendations for tomorrow
        """
        
        context = {
            "metrics": await self._gather_platform_metrics(),
            "user_data": await self._gather_user_data(),
            "issues": await self._identify_current_issues()
        }
        
        result = await self.handle_complex_task(report_task, context)
        
        # Format the report
        report = {
            "date": datetime.now().isoformat(),
            "executive_summary": self._generate_executive_summary(result),
            "detailed_insights": result["insights"],
            "recommended_actions": result["actions"],
            "metrics": context["metrics"],
            "issues": context["issues"]
        }
        
        return report
    
    def _generate_executive_summary(self, result: Dict[str, Any]) -> str:
        """Generate executive summary from agent insights"""
        insights = result.get("insights", {})
        
        summary_parts = []
        
        if insights.get("content_strategy"):
            summary_parts.append("Content: " + insights["content_strategy"][0][:100] + "...")
        
        if insights.get("economic_recommendations"):
            summary_parts.append("Economics: " + insights["economic_recommendations"][0][:100] + "...")
        
        if insights.get("safety_concerns"):
            summary_parts.append("Safety: " + insights["safety_concerns"][0][:100] + "...")
        
        return " | ".join(summary_parts)


# Import required modules
import os
from datetime import datetime 