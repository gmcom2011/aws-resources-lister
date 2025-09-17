import { SSMClient, DescribeParametersCommand } from "@aws-sdk/client-ssm";

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const listSsmParameters = async (config) => {
  const client = new SSMClient(config);
  const allParameters = [];
  let nextToken;

  do {
    const command = new DescribeParametersCommand({ NextToken: nextToken });
    const response = await client.send(command);
    if (response.Parameters) {
      allParameters.push(...response.Parameters);
    }
    nextToken = response.NextToken;
    await wait(2000); // To avoid hitting API rate limits
  } while (nextToken);

  return allParameters.map(p => ({
    Name: p.Name,
    Type: p.Type,
    LastModifiedDate: p.LastModifiedDate,
  }));
};