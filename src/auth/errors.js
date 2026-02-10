export const AUTH_ERROR_CODES = Object.freeze({
  ACCOUNT_EXISTS: "AUTH_ACCOUNT_EXISTS",
  ACCOUNT_NOT_FOUND: "AUTH_ACCOUNT_NOT_FOUND",
  CHAIN_MISSING: "AUTH_CHAIN_MISSING",
  NONCE_MISSING: "AUTH_NONCE_MISSING",
  WALLET_MISSING: "AUTH_WALLET_MISSING",
  TOKEN_MISSING: "AUTH_TOKEN_MISSING",
})

export const makeAuthError = (code, message, cause) => {
  const err = new Error(message)
  err.code = code
  if (cause) err.cause = cause
  return err
}
