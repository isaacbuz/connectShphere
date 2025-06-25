"""
Main entry point for Starling.ai Agent System
Initializes and runs all AI agents
"""

import asyncio
import logging
import os
import signal
import sys
from typing import Optional

from dotenv import load_dotenv

from .autogen_orchestrator import Starling.aiOrchestrator
from .content_moderation_agent import ContentModerationAgent
from .personalization_agent import PersonalizationAgent

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/agents.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class AgentSystem:
    """Main agent system coordinator"""
    
    def __init__(self):
        self.orchestrator: Optional[Starling.aiOrchestrator] = None
        self.content_moderator: Optional[ContentModerationAgent] = None
        self.personalization_engine: Optional[PersonalizationAgent] = None
        self.running = False
        
        # Setup signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"Received signal {signum}, shutting down...")
        self.running = False
    
    async def initialize(self):
        """Initialize all agent components"""
        try:
            logger.info("Initializing Starling.ai Agent System...")
            
            # Check required environment variables
            required_vars = [
                "OPENAI_API_KEY",
                "ANTHROPIC_API_KEY",
                "PINECONE_API_KEY",
                "REDIS_URL",
                "KAFKA_BROKERS"
            ]
            
            missing_vars = [var for var in required_vars if not os.getenv(var)]
            if missing_vars:
                raise ValueError(f"Missing required environment variables: {missing_vars}")
            
            # Initialize orchestrator
            logger.info("Initializing AutoGen Orchestrator...")
            self.orchestrator = Starling.aiOrchestrator()
            
            # Initialize individual agents
            logger.info("Initializing Content Moderation Agent...")
            self.content_moderator = ContentModerationAgent()
            
            logger.info("Initializing Personalization Agent...")
            self.personalization_engine = PersonalizationAgent()
            
            logger.info("Agent system initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize agent system: {e}")
            raise
    
    async def run(self):
        """Run the agent system"""
        try:
            await self.initialize()
            self.running = True
            
            # Start background tasks
            tasks = [
                asyncio.create_task(self._monitor_system_health()),
                asyncio.create_task(self._process_agent_tasks()),
                asyncio.create_task(self._generate_periodic_reports()),
                asyncio.create_task(self._handle_platform_optimization())
            ]
            
            logger.info("Agent system is running...")
            
            # Keep running until shutdown signal
            while self.running:
                await asyncio.sleep(1)
            
            # Cancel all tasks
            for task in tasks:
                task.cancel()
            
            # Wait for tasks to complete
            await asyncio.gather(*tasks, return_exceptions=True)
            
            logger.info("Agent system shutdown complete")
            
        except Exception as e:
            logger.error(f"Error running agent system: {e}")
            raise
    
    async def _monitor_system_health(self):
        """Monitor agent system health"""
        while self.running:
            try:
                # Check agent states
                agents_healthy = all([
                    self.content_moderator and self.content_moderator.state,
                    self.personalization_engine and self.personalization_engine.state
                ])
                
                if not agents_healthy:
                    logger.warning("Some agents are not healthy")
                
                # Log system metrics
                logger.info(f"System health check - Agents healthy: {agents_healthy}")
                
                # Wait before next check
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                logger.error(f"Error monitoring system health: {e}")
                await asyncio.sleep(5)
    
    async def _process_agent_tasks(self):
        """Process incoming agent tasks"""
        while self.running:
            try:
                # This would typically consume from a task queue
                # For now, we'll simulate with a sleep
                await asyncio.sleep(10)
                
                # Example: Process a moderation task
                sample_content = {
                    "id": "content_123",
                    "text": "This is a sample post for moderation",
                    "author": "user_456"
                }
                
                if self.content_moderator:
                    analysis = await self.content_moderator.analyze_content(sample_content)
                    logger.info(f"Content analysis result: {analysis.action}")
                
            except Exception as e:
                logger.error(f"Error processing agent tasks: {e}")
                await asyncio.sleep(5)
    
    async def _generate_periodic_reports(self):
        """Generate periodic platform reports"""
        while self.running:
            try:
                # Wait for the next report time (e.g., daily at midnight)
                await asyncio.sleep(86400)  # 24 hours
                
                if self.orchestrator:
                    report = await self.orchestrator.generate_daily_report()
                    logger.info(f"Generated daily report: {report['executive_summary']}")
                    
                    # Save report (in production, this would go to a database)
                    # For now, just log it
                    logger.info(f"Daily report saved: {report['date']}")
                
            except Exception as e:
                logger.error(f"Error generating periodic reports: {e}")
                await asyncio.sleep(3600)  # Retry in an hour
    
    async def _handle_platform_optimization(self):
        """Continuously optimize platform performance"""
        while self.running:
            try:
                # Run optimization every 6 hours
                await asyncio.sleep(21600)
                
                if self.orchestrator:
                    optimization_result = await self.orchestrator.optimize_platform_performance()
                    logger.info("Platform optimization completed")
                    
                    # Apply recommended actions
                    for action in optimization_result.get("actions", []):
                        logger.info(f"Applying optimization action: {action}")
                
            except Exception as e:
                logger.error(f"Error optimizing platform: {e}")
                await asyncio.sleep(3600)  # Retry in an hour
    
    async def handle_crisis(self, crisis_type: str, details: dict):
        """Handle crisis situations"""
        if not self.orchestrator:
            logger.error("Orchestrator not initialized")
            return
        
        logger.warning(f"Handling crisis: {crisis_type}")
        response = await self.orchestrator.handle_crisis_situation(crisis_type, details)
        
        # Execute immediate actions
        for action in response.get("immediate_actions", []):
            logger.info(f"Executing crisis action: {action}")
        
        return response


async def main():
    """Main entry point"""
    # Create logs directory if it doesn't exist
    os.makedirs("logs", exist_ok=True)
    
    # Create and run agent system
    agent_system = AgentSystem()
    
    try:
        await agent_system.run()
    except KeyboardInterrupt:
        logger.info("Shutting down agent system...")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main()) 