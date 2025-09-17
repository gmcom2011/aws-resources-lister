import { listSqsQueues } from "./services/sqs.js";
import { listSnsTopics } from "./services/sns.js";
import { listSsmParameters } from "./services/ssm.js";
import { listSesIdentities } from "./services/ses.js";
import { exportToExcel } from "./excel-exporter.js";
import { listEcsResources } from "./services/ecs.js"; // <-- UPDATED
import { listKmsKeys } from "./services/kms.js";
import generateEcrReport from "./services/ecr.js"; // <-- NEW   
import listAllEndpointsAndTargets from "./services/api-gateway.js"; // <-- NEW   
import { listS3Resources } from "./services/s3.js"; // <-- NEW
import Config from "./config.js";
import { fromIni } from "@aws-sdk/credential-providers";
const config = { region: Config.REGION, credentials: fromIni({ profile: Config.PROFILE }) };
// import * as XLSX from 'xlsx'; 
const generateReport = async () => {
    console.log("🚀 Starting AWS resource report generation...");

    try {
        // Run all list operations in parallel
        const [sqsQueues, snsTopics, ssmParameters, sesIdentities, ecsResources, kmsKeys, EcrReport, API_Gateway, S3Resources] = await Promise.all([
            listSqsQueues(config),
            listSnsTopics(config),
            listSsmParameters(config),
            listSesIdentities(config),
            listEcsResources(config), // <-- UPDATED
            listKmsKeys(config),
            generateEcrReport(config), // <-- NEW
            listAllEndpointsAndTargets(config), // <-- NEW
            listS3Resources(config)
        ]);

        console.log(`Found ${sqsQueues.length} SQS Queues.`);
        console.log(`Found ${snsTopics.length} SNS Topics.`);
        console.log(`Found ${ssmParameters.length} SSM Parameters.`);
        console.log(`Found ${sesIdentities.length} SES Identities.`);
        console.log(`Processed ${ecsResources.length} ECS service entries.`);
        console.log(`Found ${kmsKeys.length} customer-managed KMS Keys.`);

        const sheetsData = {
            SQS: sqsQueues,
            SNS: snsTopics,
            SSM_Parameters: ssmParameters,
            SES_Identities: sesIdentities,
            ECS: ecsResources, // <-- UPDATED (now a single sheet)
            KMS_Keys: kmsKeys,
            ECR: EcrReport,
            API_Gateway: API_Gateway, // <-- NEW
            S3: S3Resources
        };

        exportToExcel(sheetsData, `aws_resources_report-${Config.REGION}-${Config.PROFILE}.xlsx`);

    } catch (error) {
        console.error("❌ An error occurred during report generation:", error);
    }
};

generateReport();