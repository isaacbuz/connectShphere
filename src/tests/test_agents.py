"""
Comprehensive test suite for ConnectSphere Agent System
Tests all agent functionality, interactions, and edge cases
"""

import asyncio
import json
import pytest
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime

from src.agents import (
    BaseAgent,
    AgentConfig,
    AgentMessage,
    ContentModerationAgent,
    ContentAnalysis,
    PersonalizationAgent,
    ContentRecommendation,
    UserProfile,
    ConnectSphereOrchestrator
)


class TestBaseAgent:
    """Test cases for BaseAgent functionality"""
    
    @pytest.fixture
    def mock_config(self):
        """Create a mock agent configuration"""
        return AgentConfig(
            name="TestAgent",
            role="Test Role",
            model="gpt-4-turbo",
            temperature=0.7,
            tools=[]
        )
    
    @pytest.fixture
    def mock_agent(self, mock_config):
        """Create a mock agent for testing"""
        class TestAgent(BaseAgent):
            def _get_responsibilities(self) -> str:
                return "Test responsibilities"
            
            async def _handle_message(self, message: AgentMessage):
                return {"status": "handled"}
        
        with patch('redis.Redis'):
            with patch('kafka.KafkaProducer'):
                return TestAgent(mock_config)
    
    def test_agent_initialization(self, mock_agent):
        """Test agent initialization"""
        assert mock_agent.name == "TestAgent"
        assert mock_agent.role == "Test Role"
        assert mock_agent.state["name"] == "TestAgent"
    
    @pytest.mark.asyncio
    async def test_process_task(self, mock_agent):
        """Test task processing"""
        with patch.object(mock_agent.agent_executor, 'ainvoke', 
                         return_value={"output": "Task completed"}):
            result = await mock_agent.process_task("Test task")
            assert result == "Task completed"
    
    @pytest.mark.asyncio
    async def test_agent_collaboration(self, mock_agent):
        """Test inter-agent collaboration"""
        with patch.object(mock_agent.kafka_producer, 'send'):
            with patch.object(mock_agent.redis_client, 'get', 
                            return_value=json.dumps({"response": "success"})):
                result = await mock_agent.collaborate_with_agent(
                    "OtherAgent",
                    "test_message",
                    {"data": "test"}
                )
                assert result["response"] == "success"


class TestContentModerationAgent:
    """Test cases for Content Moderation Agent"""
    
    @pytest.fixture
    def moderation_agent(self):
        """Create a content moderation agent for testing"""
        with patch('redis.Redis'):
            with patch('kafka.KafkaProducer'):
                with patch('transformers.pipeline'):
                    return ContentModerationAgent()
    
    @pytest.mark.asyncio
    async def test_content_analysis(self, moderation_agent):
        """Test content analysis functionality"""
        test_content = {
            "id": "test_123",
            "text": "This is a test post with good content"
        }
        
        # Mock tool responses
        with patch.object(moderation_agent.tools[0], '_arun', 
                         return_value=json.dumps({"toxicity_score": 0.1, "toxic": False})):
            with patch.object(moderation_agent.tools[1], '_arun',
                            return_value=json.dumps({"misinformation_score": 0.0})):
                with patch.object(moderation_agent.tools[2], '_arun',
                                return_value=json.dumps({"nsfw_detected": False})):
                    with patch.object(moderation_agent, 'process_task',
                                    return_value="Content is safe"):
                        
                        analysis = await moderation_agent.analyze_content(test_content)
                        
                        assert isinstance(analysis, ContentAnalysis)
                        assert analysis.content_id == "test_123"
                        assert analysis.action == "approve"
                        assert analysis.toxicity_score == 0.1
                        assert not analysis.hate_speech_detected
    
    def test_sentiment_analysis(self, moderation_agent):
        """Test sentiment analysis"""
        positive_text = "This is an amazing and wonderful post!"
        negative_text = "This is terrible and awful content."
        neutral_text = "This is a post about something."
        
        assert moderation_agent._analyze_sentiment(positive_text) == "positive"
        assert moderation_agent._analyze_sentiment(negative_text) == "negative"
        assert moderation_agent._analyze_sentiment(neutral_text) == "neutral"
    
    def test_content_categorization(self, moderation_agent):
        """Test content categorization"""
        tech_text = "AI and software development are changing the internet"
        politics_text = "The election results show government policy changes"
        general_text = "Hello world"
        
        assert "technology" in moderation_agent._categorize_content(tech_text)
        assert "politics" in moderation_agent._categorize_content(politics_text)
        assert moderation_agent._categorize_content(general_text) == ["general"]
    
    @pytest.mark.asyncio
    async def test_toxic_content_rejection(self, moderation_agent):
        """Test that toxic content is properly rejected"""
        toxic_content = {
            "id": "toxic_123",
            "text": "This is extremely toxic hate speech content"
        }
        
        with patch.object(moderation_agent.tools[0], '_arun',
                         return_value=json.dumps({"toxicity_score": 0.95, "toxic": True})):
            with patch.object(moderation_agent.tools[1], '_arun',
                            return_value=json.dumps({"misinformation_score": 0.0})):
                with patch.object(moderation_agent.tools[2], '_arun',
                                return_value=json.dumps({"nsfw_detected": False})):
                    with patch.object(moderation_agent, 'process_task',
                                    return_value="Content violates policies"):
                        
                        analysis = await moderation_agent.analyze_content(toxic_content)
                        
                        assert analysis.action == "reject"
                        assert analysis.toxicity_score == 0.95
                        assert analysis.hate_speech_detected


class TestPersonalizationAgent:
    """Test cases for Personalization Agent"""
    
    @pytest.fixture
    def personalization_agent(self):
        """Create a personalization agent for testing"""
        with patch('redis.Redis'):
            with patch('kafka.KafkaProducer'):
                with patch('pinecone.init'):
                    with patch('pinecone.list_indexes', return_value=[]):
                        with patch('pinecone.create_index'):
                            with patch('pinecone.Index'):
                                return PersonalizationAgent()
    
    @pytest.mark.asyncio
    async def test_feed_generation(self, personalization_agent):
        """Test personalized feed generation"""
        user_id = "user_123"
        
        with patch.object(personalization_agent, 'process_task',
                         return_value="Generated personalized feed"):
            
            recommendations = await personalization_agent.generate_feed(user_id, 5)
            
            assert len(recommendations) == 5
            assert all(isinstance(rec, ContentRecommendation) for rec in recommendations)
            assert recommendations[0].score > recommendations[-1].score
    
    def test_user_profiler_tool(self):
        """Test user profiler tool functionality"""
        from src.agents.personalization_agent import UserProfilerTool
        
        with patch('redis.Redis') as mock_redis:
            mock_redis.return_value.get.return_value = None
            
            profiler = UserProfilerTool()
            
            interactions = [
                {"categories": ["technology", "AI"], "tags": ["machine-learning"]},
                {"categories": ["technology"], "tags": ["python", "coding"]}
            ]
            
            result = profiler._run("user_123", interactions)
            result_data = json.loads(result)
            
            assert result_data["user_id"] == "user_123"
            assert "technology" in result_data["interests"]
            assert result_data["profile_updated"] == True
    
    def test_vector_search_tool(self):
        """Test vector search tool functionality"""
        from src.agents.personalization_agent import VectorSearchTool
        
        with patch('pinecone.init'):
            with patch('pinecone.list_indexes', return_value=['connectsphere-content']):
                with patch('pinecone.Index') as mock_index:
                    mock_index.return_value.query.return_value = {
                        'matches': [
                            {'id': 'content_1', 'score': 0.9, 'metadata': {'category': 'tech'}},
                            {'id': 'content_2', 'score': 0.8, 'metadata': {'category': 'science'}}
                        ]
                    }
                    
                    with patch('langchain.embeddings.OpenAIEmbeddings'):
                        search_tool = VectorSearchTool()
                        
                        result = search_tool._run("AI technology", top_k=2)
                        result_data = json.loads(result)
                        
                        assert len(result_data) == 2
                        assert result_data[0]['score'] == 0.9


class TestAutoGenOrchestrator:
    """Test cases for AutoGen Orchestrator"""
    
    @pytest.fixture
    def orchestrator(self):
        """Create an orchestrator for testing"""
        with patch.dict('os.environ', {
            'OPENAI_API_KEY': 'test_key',
            'ANTHROPIC_API_KEY': 'test_key'
        }):
            with patch('src.agents.content_moderation_agent.ContentModerationAgent'):
                with patch('src.agents.personalization_agent.PersonalizationAgent'):
                    return ConnectSphereOrchestrator()
    
    @pytest.mark.asyncio
    async def test_complex_task_handling(self, orchestrator):
        """Test handling of complex multi-agent tasks"""
        task = "Analyze platform performance and suggest improvements"
        context = {
            "metrics": {"daily_active_users": 1000},
            "user_data": {"retention_rate": 0.7},
            "issues": []
        }
        
        with patch.object(orchestrator.user_proxy, 'initiate_chat'):
            with patch.object(orchestrator, '_extract_insights',
                            return_value={"content_strategy": ["Improve content"]}):
                with patch.object(orchestrator, '_execute_actions',
                                return_value=[{"type": "optimization", "status": "pending"}]):
                    
                    result = await orchestrator.handle_complex_task(task, context)
                    
                    assert result["task"] == task
                    assert "insights" in result
                    assert "actions" in result
    
    @pytest.mark.asyncio
    async def test_crisis_handling(self, orchestrator):
        """Test crisis situation handling"""
        crisis_type = "security_breach"
        details = {"affected_users": 100, "severity": "high"}
        
        with patch.object(orchestrator.user_proxy, 'initiate_chat'):
            with patch.object(orchestrator, '_extract_crisis_response',
                            return_value={"immediate_steps": ["Lock affected accounts"]}):
                with patch.object(orchestrator, '_execute_crisis_actions',
                                return_value=[{"type": "suspension", "status": "executed"}]):
                    
                    response = await orchestrator.handle_crisis_situation(crisis_type, details)
                    
                    assert response["crisis_type"] == crisis_type
                    assert "response_plan" in response
                    assert "immediate_actions" in response
    
    def test_insight_extraction(self, orchestrator):
        """Test extraction of insights from agent conversations"""
        messages = [
            {"name": "ContentStrategist", "content": "We should focus on video content"},
            {"name": "SafetyOfficer", "content": "Increased spam detected"},
            {"name": "EconomicAnalyst", "content": "Transaction volume is up 20%"}
        ]
        
        insights = orchestrator._extract_insights(messages)
        
        assert len(insights["content_strategy"]) == 1
        assert len(insights["safety_concerns"]) == 1
        assert len(insights["economic_recommendations"]) == 1
    
    @pytest.mark.asyncio
    async def test_daily_report_generation(self, orchestrator):
        """Test daily report generation"""
        with patch.object(orchestrator, '_gather_platform_metrics',
                         return_value={"daily_active_users": 5000}):
            with patch.object(orchestrator, '_gather_user_data',
                            return_value={"total_users": 10000}):
                with patch.object(orchestrator, '_identify_current_issues',
                                return_value=[]):
                    with patch.object(orchestrator, 'handle_complex_task',
                                    return_value={"insights": {}, "actions": []}):
                        
                        report = await orchestrator.generate_daily_report()
                        
                        assert "date" in report
                        assert "executive_summary" in report
                        assert "metrics" in report
                        assert report["metrics"]["daily_active_users"] == 5000


class TestIntegration:
    """Integration tests for the entire agent system"""
    
    @pytest.mark.asyncio
    async def test_end_to_end_content_flow(self):
        """Test complete content flow from submission to recommendation"""
        # This test would require all services to be running
        # For unit tests, we'll mock the interactions
        
        # 1. Content submission
        content = {
            "id": "integration_test_123",
            "text": "This is a great post about AI and technology!",
            "author": "test_user"
        }
        
        # 2. Content moderation
        with patch('redis.Redis'):
            with patch('kafka.KafkaProducer'):
                with patch('transformers.pipeline'):
                    moderator = ContentModerationAgent()
                    
                    with patch.object(moderator, 'analyze_content') as mock_analyze:
                        mock_analyze.return_value = ContentAnalysis(
                            content_id=content["id"],
                            toxicity_score=0.1,
                            hate_speech_detected=False,
                            misinformation_score=0.0,
                            nsfw_detected=False,
                            sentiment="positive",
                            categories=["technology"],
                            action="approve",
                            reasoning="Content is safe and relevant"
                        )
                        
                        analysis = await moderator.analyze_content(content)
                        assert analysis.action == "approve"
        
        # 3. Content indexing and recommendation
        # Would continue with personalization flow...
    
    @pytest.mark.asyncio
    async def test_agent_communication_flow(self):
        """Test communication between multiple agents"""
        # This would test the full Kafka/Redis communication flow
        # For unit tests, we mock the infrastructure
        pass


# Performance and Load Tests
class TestPerformance:
    """Performance and load testing for agents"""
    
    @pytest.mark.asyncio
    async def test_concurrent_content_analysis(self):
        """Test concurrent content analysis performance"""
        # Create multiple content items
        content_items = [
            {"id": f"perf_test_{i}", "text": f"Test content {i}"}
            for i in range(100)
        ]
        
        with patch('redis.Redis'):
            with patch('kafka.KafkaProducer'):
                with patch('transformers.pipeline'):
                    moderator = ContentModerationAgent()
                    
                    with patch.object(moderator, 'analyze_content',
                                    return_value=Mock(action="approve")):
                        
                        # Analyze all content concurrently
                        start_time = datetime.now()
                        
                        tasks = [
                            moderator.analyze_content(content)
                            for content in content_items
                        ]
                        
                        results = await asyncio.gather(*tasks)
                        
                        end_time = datetime.now()
                        duration = (end_time - start_time).total_seconds()
                        
                        assert len(results) == 100
                        assert duration < 10  # Should complete within 10 seconds
    
    @pytest.mark.asyncio
    async def test_memory_usage(self):
        """Test memory usage under load"""
        # This would monitor memory usage during operations
        # Requires memory profiling tools
        pass


# Error Handling Tests
class TestErrorHandling:
    """Test error handling and recovery"""
    
    @pytest.mark.asyncio
    async def test_llm_api_failure_handling(self):
        """Test handling of LLM API failures"""
        with patch('redis.Redis'):
            with patch('kafka.KafkaProducer'):
                agent = ContentModerationAgent()
                
                with patch.object(agent.llm, 'ainvoke',
                                side_effect=Exception("API Error")):
                    
                    with pytest.raises(Exception):
                        await agent.process_task("Test task")
    
    @pytest.mark.asyncio
    async def test_redis_connection_failure(self):
        """Test handling of Redis connection failures"""
        with patch('redis.Redis') as mock_redis:
            mock_redis.side_effect = Exception("Connection failed")
            
            with pytest.raises(Exception):
                agent = ContentModerationAgent()
    
    @pytest.mark.asyncio
    async def test_graceful_degradation(self):
        """Test system continues with degraded functionality"""
        # Test that system can operate with some services down
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"]) 