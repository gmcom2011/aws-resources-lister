import { KMSClient, ListKeysCommand, ListAliasesCommand } from "@aws-sdk/client-kms";

// import { fromIni } from "@aws-sdk/credential-providers";
// import { REGION, PROFILE } from "../config";

export const listKmsKeys = async (config) => {
  const client = new KMSClient(config);
  // Step 1: Get all aliases and map them to their TargetKeyId
  const aliasMap = new Map();
  let aliasMarker;
  do {
    const aliasResponse = await client.send(new ListAliasesCommand({ Marker: aliasMarker }));
    if (aliasResponse.Aliases) {
      aliasResponse.Aliases.forEach(alias => {
        if (alias.TargetKeyId) { // Only map aliases that are pointing to a key
          if (!aliasMap.has(alias.TargetKeyId)) {
            aliasMap.set(alias.TargetKeyId, []);
          }
          aliasMap.get(alias.TargetKeyId).push(alias.AliasName);
        }
      });
    }
    aliasMarker = aliasResponse.NextMarker;
  } while (aliasMarker);

  // Step 2: Get all keys
  const allKeys = [];
  let keyMarker;
  do {
    const keyResponse = await client.send(new ListKeysCommand({ Marker: keyMarker }));
    if (keyResponse.Keys) {
      allKeys.push(...keyResponse.Keys);
    }
    keyMarker = keyResponse.NextMarker;
  } while (keyMarker);

  // Step 3: Combine the data
  return allKeys.map(key => {
    const aliases = aliasMap.get(key.KeyId) || [];
    return {
      KeyId: key.KeyId,
      // Join multiple aliases with a comma, or show N/A if none exist
      Aliases: aliases.length > 0 ? aliases.join(", ") : "N/A",
      KeyArn: key.KeyArn,
    };
  });
};