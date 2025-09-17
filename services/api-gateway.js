// index.js
import {
    APIGatewayClient,
    GetRestApisCommand,
    GetResourcesCommand,
    GetIntegrationCommand,
    GetUsagePlansCommand,
    GetMethodCommand,
    GetAuthorizersCommand
} from "@aws-sdk/client-api-gateway"

// Configure your AWS region
// const REGION = "ap-southeast-1"; // <-- CHANGE THIS TO YOUR PREFERRED REGION


const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const listAllEndpointsAndTargets = async (config) => {
const client = new APIGatewayClient(config);
    console.log("Fetching all API Gateway REST APIs and configurations...");
    const allResults = []; // Store all results before filtering

    try {
        const { items: allUsagePlans } = await client.send(new GetUsagePlansCommand({}));
        const { items: apis } = await client.send(new GetRestApisCommand({ limit: 500 }));
        console.log(`Found ${apis.length} REST APIs.`);
        if (!apis || apis.length === 0) {
            console.log("No REST APIs found in this region.");
            return;
        }
        // console.log(JSON.stringify(apis, null ,2))
        // const data = apis.find(api => api.name === 'tcrb-bof-fraud-flag');
        // console.log(data)
        for (const api of apis) {
            // console.log(`Processing API: ${api.name} (ID: ${api.id})`);
            const { items: authorizers } = await client.send(new GetAuthorizersCommand({ restApiId: api.id }));
            const authorizersMap = new Map(authorizers.map(auth => [auth.id, auth.name]));
            const associatedPlans = allUsagePlans
                .filter(plan => plan.apiStages?.some(stage => stage.apiId === api.id))
                .map(plan => plan.name)
                .join(', ') || 'None';

            const { items: resources } = await client.send(
                new GetResourcesCommand({ restApiId: api.id })
            );
            console.log(`  Found ${resources.length} resources in API: ${api.name}`);

            for (const resource of resources) {
                if (resource.resourceMethods) {
                    for (const method of Object.keys(resource.resourceMethods)) {
                        try {
                            const methodDetails = await client.send(
                                new GetMethodCommand({ restApiId: api.id, resourceId: resource.id, httpMethod: method })
                            );

                            let authorizerInfo = methodDetails.authorizationType || 'NONE';
                            if (authorizerInfo === 'CUSTOM' && methodDetails.authorizerId) {
                                const authorizerName = authorizersMap.get(methodDetails.authorizerId);
                                authorizerInfo = `${authorizerName || methodDetails.authorizerId}`;
                            }

                            const integration = await client.send(
                                new GetIntegrationCommand({ restApiId: api.id, resourceId: resource.id, httpMethod: method })
                            );

                            console.log(JSON.stringify(integration, null, 2))
                            allResults.push({
                                "API Name": api.name,
                                "Method": method,
                                "Path": resource.path,
                                "Authorizer": authorizerInfo,
                                "API Key Required": methodDetails.apiKeyRequired ? 'Yes' : 'No',
                                "Target Type": integration.uri.split(':')[4] ? `${integration.uri.split(':')[4]}` : integration.uri,
                                "Target URI": integration.uri && integration.connectionType !== 'VPC_LINK' ? `${integration.uri.split(':')[integration.uri.split(':').length - 2]}:${integration.uri.split(':')[integration.uri.split(':').length - 1].split('/')[0]}` : "N/A",
                                "VPC Link ID": integration.connectionType === 'VPC_LINK' ? integration.connectionId : 'N/A',
                                "Usage Plans": associatedPlans,
                            });
                        } catch (error) {
                            // Gracefully skip methods without integrations
                            if (error.name !== "NotFoundException") {
                                console.error(`  Error fetching details for ${method} ${resource.path}:`, error);
                            }
                        }
                    }
                }
            }
            await wait(1000);
        };
        return allResults
        // ## Filter for endpoints with a token authorizer
        // console.log("\nFiltering for endpoints secured by a CUSTOM token authorizer...");
        // const filteredResults = allResults
        // // console.log(filteredResults);
        // // If you meant Cognito instead, you would change the line above to:
        // // const filteredResults = allResults.filter(endpoint => endpoint.Authorizer === 'COGNITO_USER_POOLS');

        // // Export the filtered results to an Excel File
        // if (filteredResults.length > 0) {
        //     const worksheet = XLSX.utils.json_to_sheet(filteredResults);
        //     const workbook = XLSX.utils.book_new();
        //     XLSX.utils.book_append_sheet(workbook, worksheet, "Token-Secured APIs");

        //     const columnWidths = Object.keys(filteredResults[0]).map(key => ({
        //         wch: Math.max(key.length, ...filteredResults.map(row => (row[key] || "").toString().length))
        //     }));
        //     worksheet["!cols"] = columnWidths;

        //     const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        //     const filename = `api-gateway-token-report-${timestamp}.xlsx`;
        //     XLSX.writeFile(workbook, filename);
        //     console.log(`\n✅ Report with ${filteredResults.length} token-secured endpoints exported to ${filename}`);
        // } else {
        //     console.log("\nNo endpoints secured by a CUSTOM authorizer were found.");
        // }

    } catch (err) {
        console.error("An error occurred:", err);
    }
};

export default listAllEndpointsAndTargets;
// listAllEndpointsAndTargets();
