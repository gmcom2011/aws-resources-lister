import {
  ECSClient,
  ListClustersCommand,
  ListServicesCommand,
  DescribeServicesCommand,
  DescribeTaskDefinitionCommand,
} from "@aws-sdk/client-ecs";


/**
 * Lists all ECS services and enriches them with their task definition and primary container image.
 */
export const listEcsResources = async (config) => {
  const client = new ECSClient(config);
  const allEcsResources = [];
  const clusterArns = (await client.send(new ListClustersCommand({}))).clusterArns || [];

  for (const clusterArn of clusterArns) {
    const clusterName = clusterArn.split("/").pop(); // Extract a clean name from the ARN
    const serviceArns = (await client.send(new ListServicesCommand({ cluster: clusterArn }))).serviceArns || [];

    if (serviceArns.length === 0) {
      allEcsResources.push({
        Cluster: clusterName,
        Service: "N/A (No services running)",
        TaskDefinition: "N/A",
        ContainerImage: "N/A",
      });
      continue;
    }

    // Get details for all services in the cluster in a single call
    const describedServices = (await client.send(new DescribeServicesCommand({ cluster: clusterArn, services: serviceArns }))).services || [];

    for (const service of describedServices) {
      const taskDefinitionArn = service.taskDefinition;
      let containerImage = "Image not found";

      try {
        // Get details for the specific task definition
        const tdResponse = await client.send(new DescribeTaskDefinitionCommand({ taskDefinition: taskDefinitionArn }));
        if (tdResponse.taskDefinition && tdResponse.taskDefinition.containerDefinitions.length > 0) {
          // Grab the image from the first container definition
          containerImage = tdResponse.taskDefinition.containerDefinitions[0].image;
        }
      } catch (tdError) {
        console.warn(`Could not describe task definition ${taskDefinitionArn}:`, tdError);
        containerImage = "Error fetching image";
      }

      allEcsResources.push({
        Cluster: clusterName,
        Service: service.serviceName,
        TaskDefinition: taskDefinitionArn.split("/").pop(),
        ContainerImage: containerImage,
      });
    }
  }
  return allEcsResources;
};