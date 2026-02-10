import { openDispute as openDisputeApi } from "../services/contractsApi"

export const createHandleDispute = ({ emit, withAction, contractUuid }) => {
  const handleDispute = () =>
    withAction("Opening dispute...", async () => {
      const reason = window.prompt("Raison du litige ?") || ""
      await openDisputeApi(contractUuid.value, reason)
      emit("updated")
      return true
    })

  return handleDispute
}
