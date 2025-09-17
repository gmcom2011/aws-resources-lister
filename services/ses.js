import { SESClient, ListIdentitiesCommand } from "@aws-sdk/client-ses";


export const listSesIdentities = async (config) => {
const client = new SESClient(config);
  // Corrected value: "EmailAddress"
  const emailCommand = new ListIdentitiesCommand({ IdentityType: "EmailAddress" });
  const emailResponse = await client.send(emailCommand);
  
  // Corrected value: "Domain"
  const domainCommand = new ListIdentitiesCommand({ IdentityType: "Domain" });
  const domainResponse = await client.send(domainCommand);

  const identities = [
    ...(emailResponse.Identities || []).map(i => ({ Type: "Email", Identity: i })),
    ...(domainResponse.Identities || []).map(i => ({ Type: "Domain", Identity: i })),
  ];
  return identities;
};