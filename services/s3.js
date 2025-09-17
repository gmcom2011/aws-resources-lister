import { S3Client, ListObjectsV2Command, GetBucketPolicyCommand, ListBucketsCommand, GetBucketLocationCommand } from "@aws-sdk/client-s3";
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
        console.error("Error calculating bucket size:", err);
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
            console.warn(`⚠️ Warning: The bucket "${BUCKET_NAME}" does not have a policy attached.`);
        } else {
            console.error("❌ Error retrieving policy:", err);
        }
    }
};

export async function listS3Resources(config) {

    const s3Client = new S3Client(config);
    const listBuckets = await s3Client.send(new ListBucketsCommand());
    const buckets = listBuckets.Buckets.map(b => b.Name);
    const results = []
    console.log(buckets)
    for (const bucket of buckets) {
        const policy = await getPolicy(bucket, s3Client).catch((err) => { console.log(err) });
        try {
            const size = await getBucketSize(bucket, s3Client)
            results.push({ bucket, size, policy: JSON.stringify(policy) })
        } catch (error) {
            results.push({ bucket, size: "0 MB", policy: JSON.stringify(policy) })
        }
    }
    return results;

}

// --- Example Usage ---
// getBucketSize("tcrb-ob-backoffice-static-resource-preproduction");