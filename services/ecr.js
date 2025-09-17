// ecr-report.js
import { ECRClient, DescribeRepositoriesCommand, DescribeImagesCommand } from "@aws-sdk/client-ecr";
import * as XLSX from 'xlsx';

// Configure your AWS region
// import { fromIni } from "@aws-sdk/credential-providers";
// import { REGION, PROFILE } from "../config";
/**
 * Converts bytes to a more readable format (MB).
 * @param {number} bytes The size in bytes.
 * @returns {string} The size in MB as a string, fixed to 2 decimal places.
 */
const bytesToMB = (bytes) => {
  if (!bytes || bytes === 0) return '0.00';
  const mb = bytes / (1024 * 1024);
  return mb.toFixed(2);
};

export default async (config) => {


  const client = new ECRClient(config);

  console.log("Starting ECR report generation...");
  const allImageData = [];
  let repositoryNextToken;

  try {
    // 1. Paginate through all repositories
    do {
      const repoCommand = new DescribeRepositoriesCommand({ nextToken: repositoryNextToken });
      const repoResponse = await client.send(repoCommand);
      const repositories = repoResponse.repositories || [];
      repositoryNextToken = repoResponse.nextToken;

      // 2. For each repository, paginate through all its images
      for (const repo of repositories) {
        console.log(`Fetching images for repository: ${repo.repositoryName}`);
        let imageNextToken;
        do {
          const imageCommand = new DescribeImagesCommand({
            repositoryName: repo.repositoryName,
            nextToken: imageNextToken,
          });
          const imageResponse = await client.send(imageCommand);
          const images = imageResponse.imageDetails || [];
          imageNextToken = imageResponse.nextToken;

          // 3. Process each image and create a row for each tag
          for (const image of images) {
            if (image.imageTags && image.imageTags.length > 0) {
              for (const tag of image.imageTags) {
                allImageData.push({
                  "Repository Name": repo.repositoryName,
                  "Image Tag": tag,
                  "Image Digest": image.imageDigest,
                  "Pushed At": image.imagePushedAt.toLocaleString(),
                  "Size (MB)": bytesToMB(image.imageSizeInBytes),
                });
              }
            }
          }
        } while (imageNextToken);
      }
    } while (repositoryNextToken);

    // 4. Export the collected data to an Excel file
    if (allImageData.length > 0) {
      const worksheet = XLSX.utils.json_to_sheet(allImageData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "ECR Image Report");

      // Auto-adjust column widths
      const columnWidths = Object.keys(allImageData[0]).map(key => ({
        wch: Math.max(key.length, ...allImageData.map(row => (row[key] || "").toString().length))
      }));
      worksheet["!cols"] = columnWidths;

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `ecr-report-${timestamp}.xlsx`;
      //   XLSX.writeFile(workbook, filename);
      //   console.log(`\n✅ Report with ${allImageData.length} image tags successfully exported to ${filename}`);
      return allImageData
    } else {
      console.log("\nNo tagged images found to export.");
    }

  } catch (err) {
    console.error("\nAn error occurred during report generation:", err);
  }
};

// generateEcrReport();