import { FirehoseClient, ListDeliveryStreamsCommand, DescribeDeliveryStreamCommand } from "@aws-sdk/client-firehose";
import { fromIni } from "@aws-sdk/credential-providers";

const testConfig = { region: "ap-southeast-1", credentials: fromIni({ profile: "preproduction" }) };

export const listDataFirehose = async (config) => {

    const client = new FirehoseClient(config);
    const input = { // ListDeliveryStreamsInput
    };
    const command = new ListDeliveryStreamsCommand(input);
    const DeliveryStreamList = await client.send(command);
    const result = []
    for (const DeliveryStream of DeliveryStreamList.DeliveryStreamNames) {
        const describeFirehoseCommand = new DescribeDeliveryStreamCommand({
            DeliveryStreamName: DeliveryStream
        });
        const describeFirehose = await client.send(describeFirehoseCommand);
        const { DeliveryStreamName, DeliveryStreamType, DeliveryStreamStatus, DeliveryStreamEncryptionConfiguration, Destinations } = describeFirehose.DeliveryStreamDescription
        try {
            Destinations.forEach((destination) => {
                const { ElasticsearchDestinationDescription } = destination
                const { ProcessingConfiguration, IndexName, RetryOptions, S3BackupMode, S3DestinationDescription, } = ElasticsearchDestinationDescription
                const { Enabled, Processors } = ProcessingConfiguration
                const { Parameters, Type } = Processors[0]
                const { DurationInSeconds } = RetryOptions
                const { BucketARN, CompressionFormat } = S3DestinationDescription
                result.push({
                    DeliveryStreamName,
                    DeliveryStreamType,
                    DeliveryStreamStatus,
                    DeliveryStreamEncryptionKeyType: DeliveryStreamEncryptionConfiguration ? DeliveryStreamEncryptionConfiguration.KeyType : "",
                    DeliveryStreamEncryptionStatus: DeliveryStreamEncryptionConfiguration ? DeliveryStreamEncryptionConfiguration.Status : "",
                    DestinationOpensearchIndex: IndexName,
                    ProcessStatus: Enabled,
                    ProcessType: Type,
                    processParameter: Parameters ? JSON.stringify(Parameters) : "",
                    S3BackupMode,
                    BucketARN,
                    CompressionFormat,
                    RetryDuration: DurationInSeconds

                })
            })

        } catch (error) {
            console.log(error)
            console.log(JSON.stringify(describeFirehose))

        }
    }
    return result
}
