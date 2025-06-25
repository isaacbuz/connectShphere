import { Kafka } from 'kafkajs';

const kafkaConfig = {
  clientId: 'starling_ai-api',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  retry: {
    initialRetryTime: 100,
    retries: 8
  },
  connectionTimeout: 3000,
  authenticationTimeout: 1000,
  requestTimeout: 30000
};

export const kafka = new Kafka(kafkaConfig);

// Create admin client for topic management
export const admin = kafka.admin();

// Create consumer for processing events
export const consumer = kafka.consumer({ 
  groupId: 'starling_ai-api-group',
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
  rebalanceTimeout: 60000
});

// Initialize Kafka topics
export const initializeKafkaTopics = async () => {
  try {
    await admin.connect();
    
    const topics = [
      {
        topic: 'user-events',
        numPartitions: 3,
        replicationFactor: 1
      },
      {
        topic: 'content-events',
        numPartitions: 3,
        replicationFactor: 1
      },
      {
        topic: 'blockchain-events',
        numPartitions: 3,
        replicationFactor: 1
      },
      {
        topic: 'ai-events',
        numPartitions: 3,
        replicationFactor: 1
      },
      {
        topic: 'moderation-events',
        numPartitions: 3,
        replicationFactor: 1
      }
    ];

    await admin.createTopics({
      topics,
      waitForLeaders: true
    });

    console.log('✅ Kafka topics initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Kafka topics:', error);
  } finally {
    await admin.disconnect();
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down Kafka connections...');
  try {
    await consumer.disconnect();
    await admin.disconnect();
  } catch (error) {
    console.error('Error during Kafka shutdown:', error);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down Kafka connections...');
  try {
    await consumer.disconnect();
    await admin.disconnect();
  } catch (error) {
    console.error('Error during Kafka shutdown:', error);
  }
  process.exit(0);
});

export default kafka; 