"""
Base Agent Framework for ConnectSphere
Implements core agent functionality with LangChain integration
"""

import asyncio
import json
import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Type

from langchain.agents import AgentExecutor, create_react_agent
from langchain.agents.output_parsers import ReActSingleInputOutputParser
from langchain.callbacks import CallbackManagerForAgentRun
from langchain.memory import ConversationBufferWindowMemory
from langchain.prompts import PromptTemplate
from langchain.schema import AgentAction, AgentFinish, BaseMessage
from langchain.tools import BaseTool
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from pydantic import BaseModel, Field
import redis
from kafka import KafkaProducer, KafkaConsumer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AgentConfig(BaseModel):
    """Configuration for an agent"""
    name: str = Field(description="Agent name")
    role: str = Field(description="Agent role")
    model: str = Field(default="gpt-4-turbo", description="LLM model to use")
    temperature: float = Field(default=0.7, description="Model temperature")
    max_tokens: int = Field(default=2000, description="Max tokens for response")
    memory_window: int = Field(default=10, description="Conversation memory window")
    tools: List[Type[BaseTool]] = Field(default_factory=list, description="Agent tools")


class AgentMessage(BaseModel):
    """Message format for inter-agent communication"""
    sender: str
    receiver: str
    message_type: str
    content: Dict[str, Any]
    timestamp: float
    correlation_id: Optional[str] = None


class BaseAgent(ABC):
    """Base class for all ConnectSphere agents"""
    
    def __init__(self, config: AgentConfig):
        self.config = config
        self.name = config.name
        self.role = config.role
        
        # Initialize LLM
        self.llm = self._initialize_llm()
        
        # Initialize memory
        self.memory = ConversationBufferWindowMemory(
            k=config.memory_window,
            memory_key="chat_history",
            return_messages=True
        )
        
        # Initialize tools
        self.tools = [tool() for tool in config.tools]
        
        # Initialize agent executor
        self.agent_executor = self._create_agent_executor()
        
        # Initialize communication channels
        self.redis_client = redis.Redis(host='redis', port=6379, decode_responses=True)
        self.kafka_producer = KafkaProducer(
            bootstrap_servers=['kafka:9092'],
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )
        
        # Start message listener
        asyncio.create_task(self._listen_for_messages())
        
        logger.info(f"Agent {self.name} initialized with role: {self.role}")
    
    def _initialize_llm(self):
        """Initialize the language model"""
        if "gpt" in self.config.model:
            return ChatOpenAI(
                model=self.config.model,
                temperature=self.config.temperature,
                max_tokens=self.config.max_tokens
            )
        elif "claude" in self.config.model:
            return ChatAnthropic(
                model=self.config.model,
                temperature=self.config.temperature,
                max_tokens=self.config.max_tokens
            )
        else:
            raise ValueError(f"Unsupported model: {self.config.model}")
    
    def _create_agent_executor(self) -> AgentExecutor:
        """Create the agent executor with tools and memory"""
        prompt = PromptTemplate.from_template(
            self._get_agent_prompt_template()
        )
        
        agent = create_react_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=prompt,
            output_parser=ReActSingleInputOutputParser()
        )
        
        return AgentExecutor(
            agent=agent,
            tools=self.tools,
            memory=self.memory,
            verbose=True,
            handle_parsing_errors=True,
            max_iterations=5
        )
    
    def _get_agent_prompt_template(self) -> str:
        """Get the agent's prompt template"""
        return f"""You are {self.name}, a {self.role} in the ConnectSphere platform.

Your responsibilities:
{self._get_responsibilities()}

You have access to the following tools:
{{tools}}

Use the following format:
Thought: you should always think about what to do
Action: the action to take, should be one of [{{tool_names}}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Current conversation history:
{{chat_history}}

Question: {{input}}
{{agent_scratchpad}}"""
    
    @abstractmethod
    def _get_responsibilities(self) -> str:
        """Get agent-specific responsibilities"""
        pass
    
    async def process_task(self, task: str) -> str:
        """Process a task using the agent executor"""
        try:
            result = await self.agent_executor.ainvoke({"input": task})
            
            # Log metrics
            self._log_metrics({
                "agent": self.name,
                "task": task[:100],
                "success": True,
                "response_length": len(result.get("output", ""))
            })
            
            return result.get("output", "")
        except Exception as e:
            logger.error(f"Error processing task: {e}")
            self._log_metrics({
                "agent": self.name,
                "task": task[:100],
                "success": False,
                "error": str(e)
            })
            raise
    
    async def collaborate_with_agent(
        self,
        target_agent: str,
        message_type: str,
        content: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Send a message to another agent and wait for response"""
        message = AgentMessage(
            sender=self.name,
            receiver=target_agent,
            message_type=message_type,
            content=content,
            timestamp=asyncio.get_event_loop().time(),
            correlation_id=f"{self.name}_{target_agent}_{asyncio.get_event_loop().time()}"
        )
        
        # Send message via Kafka
        self.kafka_producer.send(
            f"agent-{target_agent}",
            value=message.dict()
        )
        
        # Wait for response via Redis
        response_key = f"response:{message.correlation_id}"
        response = None
        
        for _ in range(30):  # Wait up to 30 seconds
            response_data = self.redis_client.get(response_key)
            if response_data:
                response = json.loads(response_data)
                self.redis_client.delete(response_key)
                break
            await asyncio.sleep(1)
        
        return response
    
    async def _listen_for_messages(self):
        """Listen for incoming messages from other agents"""
        consumer = KafkaConsumer(
            f"agent-{self.name}",
            bootstrap_servers=['kafka:9092'],
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            group_id=f"{self.name}-group"
        )
        
        async for message in consumer:
            try:
                agent_message = AgentMessage(**message.value)
                response = await self._handle_message(agent_message)
                
                if agent_message.correlation_id and response:
                    # Store response in Redis
                    self.redis_client.setex(
                        f"response:{agent_message.correlation_id}",
                        60,  # TTL: 60 seconds
                        json.dumps(response)
                    )
            except Exception as e:
                logger.error(f"Error handling message: {e}")
    
    @abstractmethod
    async def _handle_message(self, message: AgentMessage) -> Optional[Dict[str, Any]]:
        """Handle incoming messages from other agents"""
        pass
    
    def _log_metrics(self, metrics: Dict[str, Any]):
        """Log metrics to monitoring system"""
        metrics["timestamp"] = asyncio.get_event_loop().time()
        self.kafka_producer.send("agent-metrics", value=metrics)
    
    def add_tool(self, tool: BaseTool):
        """Add a new tool to the agent"""
        self.tools.append(tool)
        # Recreate agent executor with new tools
        self.agent_executor = self._create_agent_executor()
    
    def update_memory(self, messages: List[BaseMessage]):
        """Update agent's conversation memory"""
        for message in messages:
            self.memory.chat_memory.add_message(message)
    
    def clear_memory(self):
        """Clear agent's conversation memory"""
        self.memory.clear()
    
    @property
    def state(self) -> Dict[str, Any]:
        """Get current agent state"""
        return {
            "name": self.name,
            "role": self.role,
            "model": self.config.model,
            "tools": [tool.name for tool in self.tools],
            "memory_messages": len(self.memory.chat_memory.messages)
        } 