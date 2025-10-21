// Make sure you have the SDK installed:
// npm install @aws-sdk/client-dynamodb

import {
    DynamoDBClient,
    ListTablesCommand,
    DescribeTableCommand,
    BillingMode,
} from "@aws-sdk/client-dynamodb";

// Configure your client.
// By default, it uses credentials from your environment (e.g., ~/.aws/credentials or IAM role)
/**
 * Fetches all table names, handling pagination.
 */
async function getAllTableNames(config) {
    const client = new DynamoDBClient(config); // Specify your region

    const tableNames = [];
    let lastTableName = undefined;

    console.log("Fetching all table names...");

    do {
        const command = new ListTablesCommand({
            ExclusiveStartTableName: lastTableName,
        });

        const response = await client.send(command);

        if (response.TableNames) {
            tableNames.push(...response.TableNames);
        }

        lastTableName = response.LastEvaluatedTableName;
    } while (lastTableName);

    console.log(`Found ${tableNames.length} tables.`);
    return tableNames;
}

/**
 * Describes a single table to get its full configuration.
 */
async function getTableConfig(config, tableName) {

    const client = new DynamoDBClient(config); // Specify your region

    const command = new DescribeTableCommand({
        TableName: tableName,
    });

    try {
        const response = await client.send(command);
        return response.Table;
    } catch (error) {
        console.error(`Error describing table ${tableName}:`, error);
        return null;
    }
}

/**
 * Main function to list all tables and their configurations.
 */
export async function listAllTableConfigs(config) {
    const allConfigs = [];
    const tableNames = await getAllTableNames(config);

    if (tableNames.length === 0) {
        console.log("No DynamoDB tables found in this region.");
        return;
    }

    // console.log("\nFetching configuration for each table...");

    // Use Promise.all to fetch details in parallel
    const configPromises = tableNames.map(async (tableName) => {
        try {
            const configure = await getTableConfig(config, tableName);
            if (configure) {

                console.error(JSON.stringify(configure, null, 2));
                allConfigs.push({
                    TableName: configure.TableName,
                    BillingMode: configure.BillingModeSummary ? configure.BillingModeSummary.BillingMode : "PAY",
                    KMS: configure.SSEDescription ? configure.SSEDescription.KMSMasterKeyArn : "N/A",
                    EncryptStatus: configure.SSEDescription ?configure.SSEDescription.Status: "N/A",
                    GlobalSecondaryIndexes: configure.GlobalSecondaryIndexes ? configure.GlobalSecondaryIndexes.length : 0,
                    DeletionProtectionEnabled: configure.DeletionProtectionEnabled
                })
            }
        } catch (error) {
            console.log(tableName)
            console.log(error)
        }
    });

    await Promise.all(configPromises);

    // Output the full configuration object
    // console.log("\n--- All Table Configurations ---");
    // console.log(JSON.stringify(allConfigs, null, 2));
    return allConfigs


}

// // Run the function
// listAllTableConfigs().catch((err) => {
//     console.error("Failed to list table configs:", err);
// });