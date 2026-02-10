export const normalizeIdlForAnchor = (raw) => {
  const name = raw?.name ?? raw?.metadata?.name ?? "escrow_program"
  const version = raw?.version ?? raw?.metadata?.version ?? "0.1.0"

  const types = Array.isArray(raw?.types) ? raw.types : []
  const accounts = Array.isArray(raw?.accounts) ? raw.accounts : []
  const instructions = Array.isArray(raw?.instructions) ? raw.instructions : []
  const errors = Array.isArray(raw?.errors) ? raw.errors : []
  const events = Array.isArray(raw?.events) ? raw.events : []

  const typesByName = new Map(types.map((t) => [t?.name, t]))

  const normalizedAccounts = accounts.map((acc) => {
    if (acc?.type) return acc
    const typeDef = typesByName.get(acc?.name)
    if (typeDef?.type) return { ...acc, type: typeDef.type }
    return acc
  })

  const normalizedInstructions = instructions.map((ix) => ({
    ...ix,
    accounts: (ix.accounts || []).map((a) => ({
      ...a,
      isMut: a.isMut ?? a.writable ?? false,
      isSigner: a.isSigner ?? a.signer ?? false,
    })),
  }))

  return {
    ...raw,
    name,
    version,
    accounts: normalizedAccounts,
    instructions: normalizedInstructions,
    types,
    errors,
    events,
  }
}
