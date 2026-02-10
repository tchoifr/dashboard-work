import { openDispute } from "../services/contractsApi"

export const notifyBackendDispute = async (contractUuid, reason) => {
  if (!contractUuid) throw new Error("Missing contract uuid.")
  await openDispute(contractUuid, reason || "")
}
