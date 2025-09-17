import { SQSClient, ListQueuesCommand } from "@aws-sdk/client-sqs";


export const listSqsQueues = async (config) => {
  const client = new SQSClient(config);
  const command = new ListQueuesCommand({});
  const response = await client.send(command);
  const queues = response.QueueUrls || [];
  return queues.map(url => ({ QueueUrl: url }));
};