import { Program } from "@coral-xyz/anchor"
import { normalizeIdlForAnchor } from "./idl"
import { toPublicKey } from "./keys"

export const loadProgram = (rawIdl, programId, provider) => {
  if (!rawIdl) throw new Error("IDL manquante.")
  if (!programId) throw new Error("ProgramId manquant.")
  if (!provider) throw new Error("Provider manquant.")

  const idl = normalizeIdlForAnchor(rawIdl)
  const programPk = toPublicKey(programId)

  const dbg = (idl.accounts || []).map((a) => ({
    name: a?.name,
    hasType: !!a?.type,
    kind: a?.type?.kind,
    fields: a?.type?.fields?.length,
  }))
  console.log("🧩 [loadProgram] accounts normalized =", dbg)

  const missing = dbg.filter((x) => !x.hasType)
  if (missing.length) {
    throw new Error(
      `IDL invalide: accounts sans type: ${missing.map((m) => m.name).join(", ")}`
    )
  }

  return new Program({ ...idl, address: programPk.toBase58() }, provider)
}
