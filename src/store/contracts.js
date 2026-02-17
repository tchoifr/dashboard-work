import { defineStore } from "pinia"
import { listContracts, getContract } from "../services/contractsApi"
import { getUser } from "../services/usersApi"
import { useAuthStore } from "./auth"

const PARTY_CACHE_KEY = "contracts_party_cache_v1"
const PARTY_NAME_CACHE_KEY = "contracts_party_name_cache_v1"
const USERNAME_BY_UUID_CACHE_KEY = "contracts_username_by_uuid_cache_v1"

const readPartyCache = () => {
  try {
    const raw = localStorage.getItem(PARTY_CACHE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

const writePartyCache = (cache) => {
  try {
    localStorage.setItem(PARTY_CACHE_KEY, JSON.stringify(cache || {}))
  } catch {
    // ignore cache write failures
  }
}

const readPartyNameCache = () => {
  try {
    const raw = localStorage.getItem(PARTY_NAME_CACHE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

const writePartyNameCache = (cache) => {
  try {
    localStorage.setItem(PARTY_NAME_CACHE_KEY, JSON.stringify(cache || {}))
  } catch {
    // ignore cache write failures
  }
}

const readUsernameByUuidCache = () => {
  try {
    const raw = localStorage.getItem(USERNAME_BY_UUID_CACHE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

const writeUsernameByUuidCache = (cache) => {
  try {
    localStorage.setItem(USERNAME_BY_UUID_CACHE_KEY, JSON.stringify(cache || {}))
  } catch {
    // ignore cache write failures
  }
}

const isNonEmpty = (value) => value !== null && value !== undefined && String(value).trim() !== ""

const applyPartyCache = (contract, cache) => {
  if (!contract?.uuid) return contract
  const saved = cache?.[contract.uuid]
  if (!saved) return contract

  return {
    ...contract,
    employerName: contract.employerName || saved.employerName || null,
    employerWallet: contract.employerWallet || saved.employerWallet || null,
    freelancerName: contract.freelancerName || saved.freelancerName || null,
    freelancerWallet: contract.freelancerWallet || saved.freelancerWallet || null,
    employer: {
      ...(contract.employer || {}),
      username: contract?.employer?.username || saved.employerName || null,
      walletAddress: contract?.employer?.walletAddress || saved.employerWallet || null,
    },
    freelancer: {
      ...(contract.freelancer || {}),
      username: contract?.freelancer?.username || saved.freelancerName || null,
      walletAddress: contract?.freelancer?.walletAddress || saved.freelancerWallet || null,
    },
  }
}

const applyPartyNameCache = (contract, nameCache) => {
  const employerWallet = String(contract?.employerWallet || "").trim()
  const freelancerWallet = String(contract?.freelancerWallet || "").trim()
  const employerNameFromWallet = employerWallet ? nameCache?.[employerWallet] : null
  const freelancerNameFromWallet = freelancerWallet ? nameCache?.[freelancerWallet] : null

  return {
    ...contract,
    employerName: contract.employerName || employerNameFromWallet || null,
    freelancerName: contract.freelancerName || freelancerNameFromWallet || null,
    employer: {
      ...(contract.employer || {}),
      username: contract?.employer?.username || contract.employerName || employerNameFromWallet || null,
    },
    freelancer: {
      ...(contract.freelancer || {}),
      username:
        contract?.freelancer?.username || contract.freelancerName || freelancerNameFromWallet || null,
    },
  }
}

const rememberPartyFields = (cache, contract) => {
  if (!contract?.uuid) return cache
  const next = { ...(cache || {}) }
  const current = next[contract.uuid] || {}
  const merged = {
    employerName: contract.employerName || current.employerName || null,
    employerWallet: contract.employerWallet || current.employerWallet || null,
    freelancerName: contract.freelancerName || current.freelancerName || null,
    freelancerWallet: contract.freelancerWallet || current.freelancerWallet || null,
  }

  if (
    isNonEmpty(merged.employerName) ||
    isNonEmpty(merged.employerWallet) ||
    isNonEmpty(merged.freelancerName) ||
    isNonEmpty(merged.freelancerWallet)
  ) {
    next[contract.uuid] = merged
  }
  return next
}

const rememberPartyNamesByWallet = (cache, contract) => {
  const next = { ...(cache || {}) }

  const employerWallet = String(contract?.employerWallet || "").trim()
  const employerName = String(contract?.employerName || "").trim()
  if (employerWallet && employerName && employerName !== "-") {
    next[employerWallet] = employerName
  }

  const freelancerWallet = String(contract?.freelancerWallet || "").trim()
  const freelancerName = String(contract?.freelancerName || "").trim()
  if (freelancerWallet && freelancerName && freelancerName !== "-") {
    next[freelancerWallet] = freelancerName
  }

  return next
}

const pickUserName = (payload) => {
  const user = payload?.user && typeof payload.user === "object" ? payload.user : payload
  return (
    user?.username ||
    user?.name ||
    payload?.username ||
    payload?.name ||
    null
  )
}

const normalizeContract = (raw = {}) => {
  const contract = raw?.contract && typeof raw.contract === "object" ? raw.contract : raw
  const root = raw && typeof raw === "object" ? raw : {}
  const pickFromContractOrRoot = (...keys) => {
    for (const key of keys) {
      const fromContract = contract?.[key]
      if (fromContract !== null && fromContract !== undefined && fromContract !== "") return fromContract
      const fromRoot = root?.[key]
      if (fromRoot !== null && fromRoot !== undefined && fromRoot !== "") return fromRoot
    }
    return null
  }

  const onchain = contract?.onchain || {}
  const amounts = contract?.amounts || {}
  const timeline = contract?.timeline || {}
  const period = contract?.period || {}
  const employerObj = contract?.employer || {}
  const freelancerObj = contract?.freelancer || {}

  const employerUserUuid =
    pickFromContractOrRoot("employerUserUuid", "employer_user_uuid") ||
    employerObj.uuid ||
    null

  const freelancerUserUuid =
    pickFromContractOrRoot("freelancerUserUuid", "freelancer_user_uuid") ||
    freelancerObj.uuid ||
    null

  return {
    ...root,
    ...contract,
    uuid: pickFromContractOrRoot("uuid", "contract_uuid", "id"),
    status: pickFromContractOrRoot("status") || "DRAFT",
    title:
      pickFromContractOrRoot(
        "title",
        "contractTitle",
        "contract_title",
        "name",
        "jobTitle",
        "job_title",
      ) ||
      "",
    amountUsdc:
      pickFromContractOrRoot(
        "amountUsdc",
        "amount_usdc",
        "amountTotalUsdc",
        "amount_total_usdc",
        "totalAmountUsdc",
        "total_amount_usdc",
        "usdcAmount",
        "usdc_amount",
      ) ??
      amounts.totalUsdc ??
      amounts.total_usdc ??
      amounts.amountUsdc ??
      amounts.amount_usdc ??
      contract.amount ??
      null,
    startAt:
      pickFromContractOrRoot(
        "startAt",
        "start_at",
        "startDate",
        "start_date",
        "startsAt",
        "starts_at",
        "periodStart",
        "period_start",
      ) ||
      period.start ||
      period.startAt ||
      pickFromContractOrRoot("createdAt", "created_at") ||
      timeline.start ||
      null,
    endAt:
      pickFromContractOrRoot(
        "findPeriodAt",
        "find_period_at",
        "endAt",
        "end_at",
        "endDate",
        "end_date",
        "endsAt",
        "ends_at",
        "periodEnd",
        "period_end",
      ) ||
      period.end ||
      period.endAt ||
      timeline.end ||
      null,
    checkpoints:
      pickFromContractOrRoot("checkpoints", "validationCheckpoints", "validation_checkpoints") ||
      null,
    employerName:
      pickFromContractOrRoot("employerName", "employer_name") ||
      employerObj.username ||
      employerObj.name ||
      null,
    employerWallet:
      pickFromContractOrRoot(
        "employerWallet",
        "employer_wallet",
        "initializerWallet",
        "initializer_wallet",
      ) ||
      onchain.initializerWallet ||
      onchain.initializer_wallet ||
      employerObj.walletAddress ||
      employerObj.wallet_address ||
      null,
    freelancerName:
      pickFromContractOrRoot("freelancerName", "freelancer_name") ||
      freelancerObj.username ||
      freelancerObj.name ||
      null,
    freelancerWallet:
      pickFromContractOrRoot(
        "freelancerWallet",
        "freelancer_wallet",
        "workerWallet",
        "worker_wallet",
      ) ||
      onchain.workerWallet ||
      onchain.worker_wallet ||
      freelancerObj.walletAddress ||
      freelancerObj.wallet_address ||
      null,
    contractId32Hex:
      contract.contractId32Hex ||
      contract.contract_id32_hex ||
      onchain.contractId32Hex ||
      onchain.contract_id32_hex ||
      null,
    contractIdU64:
      contract.contractIdU64 ||
      contract.contract_id_u64 ||
      onchain.contractIdU64 ||
      onchain.contract_id_u64 ||
      null,
    escrowStatePda:
      contract.escrowStatePda ||
      contract.escrow_state_pda ||
      onchain.escrowStatePda ||
      onchain.escrow_state_pda ||
      null,
    vaultPda:
      contract.vaultPda ||
      contract.vault_pda ||
      onchain.vaultPda ||
      onchain.vault_pda ||
      null,
    onchain,
    amounts,
    employerUserUuid,
    freelancerUserUuid,
    employer: employerObj,
    freelancer: freelancerObj,
    initializerWallet:
      pickFromContractOrRoot("initializerWallet", "initializer_wallet") ||
      employerObj.walletAddress ||
      employerObj.wallet_address ||
      null,
    workerWallet:
      pickFromContractOrRoot("workerWallet", "worker_wallet") ||
      freelancerObj.walletAddress ||
      freelancerObj.wallet_address ||
      null,
  }
}

export const useContractsStore = defineStore("contracts", {
  state: () => ({
    items: [],
    current: null,
    loading: false,
    error: null,
    partyCache: readPartyCache(),
    partyNameCache: readPartyNameCache(),
    usernameByUuidCache: readUsernameByUuidCache(),
  }),

  getters: {
    myContracts(state) {
      const auth = useAuthStore()
      const myUuid = auth.user?.uuid
      if (!myUuid) return []
      return state.items.filter(
        (c) => c.employerUserUuid === myUuid || c.freelancerUserUuid === myUuid
      )
    },
  },

  actions: {
    async hydratePartyNamesFromUsers(contracts) {
      const list = Array.isArray(contracts) ? contracts : []
      const missingUuids = new Set()

      for (const c of list) {
        if (!c?.employerName && c?.employerUserUuid && !this.usernameByUuidCache[c.employerUserUuid]) {
          missingUuids.add(c.employerUserUuid)
        }
        if (!c?.freelancerName && c?.freelancerUserUuid && !this.usernameByUuidCache[c.freelancerUserUuid]) {
          missingUuids.add(c.freelancerUserUuid)
        }
      }

      if (missingUuids.size) {
        const results = await Promise.all(
          Array.from(missingUuids).map(async (uuid) => {
            try {
              const data = await getUser(uuid)
              const username = pickUserName(data)
              return { uuid, username }
            } catch {
              return { uuid, username: null }
            }
          }),
        )

        const nextCache = { ...(this.usernameByUuidCache || {}) }
        for (const item of results) {
          if (item?.uuid && item?.username) nextCache[item.uuid] = item.username
        }
        this.usernameByUuidCache = nextCache
        writeUsernameByUuidCache(this.usernameByUuidCache)
      }

      return list.map((c) => {
        const employerName = c.employerName || this.usernameByUuidCache[c.employerUserUuid] || null
        const freelancerName = c.freelancerName || this.usernameByUuidCache[c.freelancerUserUuid] || null
        return {
          ...c,
          employerName,
          freelancerName,
          employer: {
            ...(c.employer || {}),
            username: c?.employer?.username || employerName || null,
          },
          freelancer: {
            ...(c.freelancer || {}),
            username: c?.freelancer?.username || freelancerName || null,
          },
        }
      })
    },

    reset() {
      this.items = []
      this.current = null
      this.loading = false
      this.error = null
    },

    upsert(contract) {
      let normalized = normalizeContract(contract)
      normalized = applyPartyCache(normalized, this.partyCache)
      normalized = applyPartyNameCache(normalized, this.partyNameCache)
      if (!normalized?.uuid) return

      this.partyCache = rememberPartyFields(this.partyCache, normalized)
      writePartyCache(this.partyCache)
      this.partyNameCache = rememberPartyNamesByWallet(this.partyNameCache, normalized)
      writePartyNameCache(this.partyNameCache)

      const idx = this.items.findIndex((c) => c.uuid === normalized.uuid)
      if (idx === -1) {
        this.items = [normalized, ...this.items]
      } else {
        this.items = this.items.map((c) =>
          c.uuid === normalized.uuid ? { ...c, ...normalized } : c
        )
      }
    },

    async fetchAll(params = {}) {
      this.loading = true
      this.error = null
      try {
        const data = await listContracts(params)
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
        const previousByUuid = new Map(this.items.map((item) => [item.uuid, item]))
        const normalized = items.map((item) => {
          const current = normalizeContract(item)
          const previous = previousByUuid.get(current.uuid) || {}
          const merged = {
            ...current,
            employerName: current.employerName || previous.employerName || null,
            employerWallet: current.employerWallet || previous.employerWallet || null,
            freelancerName: current.freelancerName || previous.freelancerName || null,
            freelancerWallet: current.freelancerWallet || previous.freelancerWallet || null,
          }
          return applyPartyNameCache(applyPartyCache(merged, this.partyCache), this.partyNameCache)
        })

        const hydrated = await this.hydratePartyNamesFromUsers(normalized)
        this.items = hydrated
        this.partyCache = hydrated.reduce(
          (acc, contract) => rememberPartyFields(acc, contract),
          this.partyCache || {},
        )
        writePartyCache(this.partyCache)
        this.partyNameCache = hydrated.reduce(
          (acc, contract) => rememberPartyNamesByWallet(acc, contract),
          this.partyNameCache || {},
        )
        writePartyNameCache(this.partyNameCache)
      } catch (e) {
        this.error = e?.response?.data?.message || e.message || "Failed to load contracts"
      } finally {
        this.loading = false
      }
    },

    async fetchOne(uuid) {
      this.loading = true
      this.error = null
      try {
        const data = await getContract(uuid)
        let current = normalizeContract(data?.contract || data)
        current = applyPartyCache(current, this.partyCache)
        current = applyPartyNameCache(current, this.partyNameCache)
        const [hydrated] = await this.hydratePartyNamesFromUsers([current])
        current = hydrated || current
        this.current = current
        this.partyCache = rememberPartyFields(this.partyCache, current)
        writePartyCache(this.partyCache)
        this.partyNameCache = rememberPartyNamesByWallet(this.partyNameCache, current)
        writePartyNameCache(this.partyNameCache)
        return this.current
      } catch (e) {
        this.error = e?.response?.data?.message || e.message || "Failed to load contract"
        throw e
      } finally {
        this.loading = false
      }
    },
  },
})
