import {
    S3Client,
    ListObjectsV2Command,
    GetBucketPolicyCommand,
    ListBucketsCommand,
    GetBucketLocationCommand,
    GetBucketVersioningCommand,
    GetPublicAccessBlockCommand,
    GetBucketLifecycleConfigurationCommand,
    GetBucketEncryptionCommand,
} from "@aws-sdk/client-s3";
// Configure your AWS region and credentials

async function getBucketSize(bucketName, s3Client) {
    let totalSize = 0;
    let continuationToken;

    console.log(`Calculating size for bucket: ${bucketName}...`);

    try {
        do {
            const command = new ListObjectsV2Command({
                Bucket: bucketName,
                ContinuationToken: continuationToken,
            });

            const response = await s3Client.send(command);

            // Sum the size of all objects in the current batch
            if (response.Contents) {
                totalSize += response.Contents.reduce((sum, obj) => sum + obj.Size, 0);
            }

            // The response indicates if there are more objects to list
            continuationToken = response.NextContinuationToken;

        } while (continuationToken);

        // Format the size for readability
        console.log(`Total size in bytes: ${totalSize}`);
        const size = (totalSize / (totalSize > 1024 * 1024 * 1024 ? 1024 * 1024 * 1024 : 1024 * 1024)).toFixed(2);
        console.log(`Total bucket size: ${size} MB`);
        return `${size} ${totalSize > 1024 * 1024 * 1024 ? "GB" : "MB"}`;

    } catch (err) {
        console.error("❌ Error calculating bucket size:", err.$metadata.httpStatusCode);
    }
}


async function getBucketLocation(bucketName, s3Client) {
    try {
        const command = new GetBucketLocationCommand({
            Bucket: bucketName
        });
        const response = await s3Client.send(command);
        return response.LocationConstraint
        // console.log(response)
    } catch (error) {
        console.log("❌ Error retrieved bucket Location:", error.$metadata.httpStatusCode)
        return "N/A"
    }
}

async function getBucketVersioningConfig(bucketName, s3Client) {
    try {
        const command = new GetBucketVersioningCommand({
            Bucket: bucketName
        });
        const response = await s3Client.send(command);
        return response.Status
        // console.log(response)
    } catch (error) {
        console.log("❌ Error retrieved bucket Versioning:", error.$metadata.httpStatusCode)
        return "N/A"
    }
}


async function GetBucketEncryption(bucketName, s3Client) {
    try {
        const command = new GetBucketEncryptionCommand({
            Bucket: bucketName
        });
        const response = await s3Client.send(command);

        return response.ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm
    } catch (error) {
        console.log("❌ Error retrieved bucket Encryption:", error.$metadata.httpStatusCode)
        return "N/A"
    }
}

async function getPublicAccessBlock(bucketName, s3Client) {

    try {
        const command = new GetPublicAccessBlockCommand({
            Bucket: bucketName
        });
        const response = await s3Client.send(command);

        return response.PublicAccessBlockConfiguration
        // console.log(response)
    } catch (error) {
        console.log("❌ Error retrieved bucket Access Blocking:", error.$metadata.httpStatusCode)
        return {
            BlockPublicAcls: "N/A",
            IgnorePublicAcls: "N/A",
            BlockPublicPolicy: "N/A",
            RestrictPublicBuckets: "N/A",
        }
    }
}

async function getBucketLifecycleConfiguration(bucketName, s3Client) {

    try {
        const command = new GetBucketLifecycleConfigurationCommand({
            Bucket: bucketName
        });
        const response = await s3Client.send(command);

        return response.Rules.length
        // console.log(response)
    } catch (error) {
        console.log("❌ Error retrieved bucket Lifecycle:", error.$metadata.httpStatusCode)
        return 0
    }
}

const getPolicy = async (bucketName, s3Client) => {
    try {
        // Create the command with the bucket name.
        const command = new GetBucketPolicyCommand({
            Bucket: bucketName,
        });

        // Send the command and wait for the response.
        const response = await s3Client.send(command);

        // The policy is a JSON string, so we parse it for easier access.
        const policy = JSON.parse(response.Policy);

        console.log("✅ Successfully retrieved policy:");
        // console.log(JSON.stringify(policy, null, 2)); // Pretty-print the policy
        return policy;
    } catch (err) {
        // Handle the case where the bucket has no policy.
        if (err.name === 'NoSuchBucketPolicy') {
            console.warn(`⚠️ Warning: The bucket "${bucketName}" does not have a policy attached.`);
        } else {
            console.error("❌ Error retrieving policy:", err.$metadata.httpStatusCode);
        }
    }
};

export async function listS3Resources(config) {

    const s3Client = new S3Client(config);
    const listBuckets = await s3Client.send(new ListBucketsCommand());
    const buckets = listBuckets.Buckets.map(b => b.Name);
    const results = []
    // console.log(buckets)
    for (const bucket of buckets) {
        const bucketLocation = await getBucketLocation(bucket, s3Client).catch((err) => { console.log(err.$metadata.httpStatusCode) });
        const encryption = await GetBucketEncryption(bucket, s3Client).catch((err) => { console.log(err.$metadata.httpStatusCode) });
        const bucketVersioningConfig = await getBucketVersioningConfig(bucket, s3Client).catch((err) => { console.log(err.$metadata.httpStatusCode) });
        const bucketLifecycleConfiguration = await getBucketLifecycleConfiguration(bucket, s3Client).catch((err) => { console.log(err.$metadata.httpStatusCode) });
        const {
            BlockPublicAcls,
            IgnorePublicAcls,
            BlockPublicPolicy,
            RestrictPublicBuckets
        } = await getPublicAccessBlock(bucket, s3Client).catch((err) => { console.log(err.$metadata.httpStatusCode) }) || 0;

        const policy = await getPolicy(bucket, s3Client).catch((err) => { console.log(err.$metadata.httpStatusCode) }) || "";
        try {
            // const size = await getBucketSize(bucket, s3Client)
            results.push({
                bucket,
                bucketLocation,
                encryption,
                backetVersion: bucketVersioningConfig,
                BlockPublicAcls,
                IgnorePublicAcls,
                BlockPublicPolicy,
                RestrictPublicBuckets,
                bucketLifecycleConfiguration,
                policy: JSON.stringify(policy)
            })
        } catch (error) {
            results.push({
                bucket,
                bucketLocation,
                encryption,
                backetVersion: bucketVersioningConfig,
                BlockPublicAcls,
                IgnorePublicAcls,
                BlockPublicPolicy,
                RestrictPublicBuckets,
                bucketLifecycleConfiguration,
                backetVersion: bucketVersioningConfig,
                policy: JSON.stringify(policy)
            })
        }
    }
    return results;

}