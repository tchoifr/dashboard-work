export const createWithAction = ({ loading, txStatus }) => {
  const withAction = async (label, action) => {
    try {
      loading.value = true
      txStatus.value = label
      const sig = await action()
      txStatus.value = "Transaction sent."
      return sig
    } catch (e) {
      console.error(label, e)
      alert(e?.message || "Transaction failed.")
    } finally {
      loading.value = false
    }
  }

  return withAction
}
