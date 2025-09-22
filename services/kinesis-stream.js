import {
    KinesisClient,
    ListStreamsCommand,
    DescribeStreamSummaryCommand
} from "@aws-sdk/client-kinesis";

// Configure the client. Ensure your region and credentials are set up.
// Example: environment variables AWS_REGION, AWS_ACCESS_KEY_ID, etc.
export const listAndDescribeStreams = async (config) => {
    try {
        const client = new KinesisClient(config); // 👈 Replace with your AWS region

        // 1. List all available stream names
        console.log("Fetching stream names...");
        const listCommand = new ListStreamsCommand({});
        const listResponse = await client.send(listCommand);

        const streamNames = listResponse.StreamNames;

        if (!streamNames || streamNames.length === 0) {
            console.log("✅ No Kinesis streams found in this region.");
            return;
        }

        console.log(`Found ${streamNames.length} streams. Describing each...`);
        const result = []
        // 2. Describe each stream to get its detailed settings
        for (const name of streamNames) {
            const describeCommand = new DescribeStreamSummaryCommand({ StreamName: name });
            const summaryResponse = await client.send(describeCommand);
            const details = summaryResponse.StreamDescriptionSummary;
            result.push({
                StreamName: details.StreamName,
                StreamStatus: details.StreamStatus,
                StreamMode: details.StreamModeDetails.StreamMode,
                OpenShardCount: details.OpenShardCount,
                RetentionPeriodHours: details.RetentionPeriodHours,
                EncryptionType: details.EncryptionType,
                StreamARN: details.StreamARN,
            })
        }
        return result
    } catch (error) {
        console.error("❌ An error occurred:", error);
    }
};

listAndDescribeStreams();