const FALLBACK_COUNTRY_CODES = [
  "AE", "AR", "AT", "AU", "BE", "BG", "BH", "BR", "CA", "CH", "CL", "CN", "CO", "CZ", "DE",
  "DK", "DZ", "EE", "EG", "ES", "FI", "FR", "GB", "GH", "GR", "HK", "HR", "HU", "ID", "IE",
  "IL", "IN", "IQ", "IR", "IS", "IT", "JO", "JP", "KE", "KR", "KW", "KZ", "LB", "LT", "LU",
  "LV", "MA", "ME", "MM", "MX", "MY", "NG", "NL", "NO", "NZ", "OM", "PE", "PH", "PK", "PL",
  "PT", "QA", "RO", "RS", "RU", "SA", "SE", "SG", "SI", "SK", "TH", "TN", "TR", "TW", "UA",
  "US", "UY", "VN", "ZA",
]

const getRegionCodes = () => {
  if (typeof Intl?.supportedValuesOf === "function") {
    try {
      return Intl.supportedValuesOf("region")
        .filter((code) => /^[A-Z]{2}$/.test(code))
        .filter((code) => code !== "ZZ")
    } catch {
      return FALLBACK_COUNTRY_CODES
    }
  }
  return FALLBACK_COUNTRY_CODES
}

export const buildCountryOptions = (locale = "en") => {
  const regionCodes = getRegionCodes()
  const display = new Intl.DisplayNames([locale], { type: "region" })

  return regionCodes
    .map((code) => ({
      code,
      label: display.of(code) || code,
    }))
    .filter((item) => item.label && item.label !== item.code)
    .sort((a, b) => a.label.localeCompare(b.label))
}

export const COUNTRY_OPTIONS = buildCountryOptions("en")
