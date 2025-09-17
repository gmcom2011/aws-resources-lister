import { SNSClient, ListTopicsCommand } from "@aws-sdk/client-sns";


export const listSnsTopics = async (config) => {
const client = new SNSClient(config);
  const command = new ListTopicsCommand({});
  const response = await client.send(command);
  const topics = response.Topics || [];
  return topics.map(topic => ({ TopicArn: topic.TopicArn }));
};