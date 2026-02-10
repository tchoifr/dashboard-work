const WALLET_ERROR_CODES = Object.freeze({
  PROVIDER_NOT_FOUND: "WALLET_PROVIDER_NOT_FOUND",
  CONNECT_REJECTED: "WALLET_CONNECT_REJECTED",
  REQUEST_PENDING: "WALLET_REQUEST_PENDING",
  SIGN_REJECTED: "WALLET_SIGN_REJECTED",
  SIGN_UNSUPPORTED: "WALLET_SIGN_UNSUPPORTED",
})

const makeWalletError = (code, message, cause) => {
  const err = new Error(message)
  err.code = code
  if (cause) err.cause = cause
  return err
}

const getErrorCode = (e) => Number(e?.code)
const getErrorMessage = (e) => String(e?.message || "").toLowerCase()

const waitForPublicKey = async (provider, timeoutMs = 1200) =>
  new Promise((resolve) => {
    const existing = provider?.publicKey
    if (existing) {
      resolve(existing)
      return
    }

    let done = false
    let timer = null

    const finish = (value) => {
      if (done) return
      done = true
      if (timer) clearTimeout(timer)
      try {
        provider?.off?.("connect", onConnect)
        provider?.off?.("accountChanged", onAccountChanged)
      } catch {
        // no-op
      }
      resolve(value || null)
    }

    const onConnect = (pk) => finish(pk || provider?.publicKey || null)
    const onAccountChanged = (pk) => finish(pk || provider?.publicKey || null)

    try {
      provider?.on?.("connect", onConnect)
      provider?.on?.("accountChanged", onAccountChanged)
    } catch {
      // no-op
    }

    timer = setTimeout(() => finish(provider?.publicKey || null), timeoutMs)
  })

const mapConnectError = (e) => {
  const code = getErrorCode(e)
  const msg = getErrorMessage(e)

  if (code === -32002 || msg.includes("already pending") || msg.includes("pending")) {
    return makeWalletError(
      WALLET_ERROR_CODES.REQUEST_PENDING,
      "Une demande Phantom est deja en cours. Ouvre l'extension Phantom et valide-la.",
      e,
    )
  }

  if (code === 4001 || msg.includes("rejected") || msg.includes("user rejected")) {
    return makeWalletError(
      WALLET_ERROR_CODES.CONNECT_REJECTED,
      "Connexion Phantom refusee. Ouvre l'extension, deverrouille le wallet, puis approuve la connexion pour localhost:5173.",
      e,
    )
  }

  return e
}

const mapSignError = (e) => {
  const code = getErrorCode(e)
  const msg = getErrorMessage(e)

  if (code === 4001 || msg.includes("rejected") || msg.includes("user rejected")) {
    return makeWalletError(
      WALLET_ERROR_CODES.SIGN_REJECTED,
      "Signature refusee dans Phantom.",
      e,
    )
  }

  return e
}

export { WALLET_ERROR_CODES }

export const getPhantomProvider = () => {
  if (typeof window === "undefined") return null

  const injected = window.phantom?.solana
  if (injected?.isPhantom) return injected

  const sol = window.solana
  if (sol?.isPhantom) return sol

  if (Array.isArray(sol?.providers)) {
    return sol.providers.find((p) => p?.isPhantom) || null
  }

  return null
}

export const getConnectedPhantomPublicKey = () => {
  const provider = getPhantomProvider()
  if (!provider?.publicKey) return null
  return provider.publicKey
}

export const connectPhantom = async ({ onlyIfTrusted = false, interactive = true } = {}) => {
  const provider = getPhantomProvider()
  if (!provider) {
    throw makeWalletError(
      WALLET_ERROR_CODES.PROVIDER_NOT_FOUND,
      "Phantom non detecte. Installe l'extension Phantom.",
    )
  }

  // Déjà connecté
  if (provider.isConnected && provider.publicKey) {
    return { provider, publicKey: provider.publicKey }
  }

  // 1) Mode silencieux : ne DOIT JAMAIS ouvrir de popup
  if (onlyIfTrusted) {
    try {
      const res = await provider.connect({ onlyIfTrusted: true })
      return { provider, publicKey: res?.publicKey || provider.publicKey || null }
    } catch (e) {
      // Pas approuvé = normal => on renvoie null, pas une erreur
      return { provider, publicKey: null }
    }
  }

  // 2) Mode interactif : appel direct pour conserver le user-gesture du clic.
  // Un preflight async onlyIfTrusted peut casser ce contexte et faire échouer la popup.
  try {
    if (!interactive) return { provider, publicKey: null }

    const res = await provider.connect() // popup
    const finalPk = res?.publicKey || provider.publicKey || (await waitForPublicKey(provider))
    return { provider, publicKey: finalPk || null }
  } catch (e) {
    // Certains environnements renvoient une erreur alors que la connexion finit juste après.
    const settledPk = provider.publicKey || (await waitForPublicKey(provider, 1500))
    if (settledPk) return { provider, publicKey: settledPk }
    throw mapConnectError(e)
  }
}


export const signMessageWithPhantom = async (provider, encodedMessage) => {
  if (!provider?.signMessage) {
    throw makeWalletError(
      WALLET_ERROR_CODES.SIGN_UNSUPPORTED,
      "Ce wallet ne supporte pas la signature de message.",
    )
  }

  try {
    return await provider.signMessage(encodedMessage, "utf8")
  } catch (e) {
    throw mapSignError(e)
  }
}

export const ensurePhantomMatchesWallet = async (expectedWalletAddress) => {
  const { provider, publicKey } = await connectPhantom()
  const connectedWallet = publicKey?.toBase58() || ""

  if (expectedWalletAddress && connectedWallet && expectedWalletAddress !== connectedWallet) {
    throw new Error("Wallet Phantom different du compte connecte.")
  }

  return { provider, publicKey, connectedWallet }
}
