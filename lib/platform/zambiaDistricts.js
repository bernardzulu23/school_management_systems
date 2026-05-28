/**
 * Districts by Zambian province — used for onboarding validation and future province/district admin scopes.
 * Source: common administrative districts (not exhaustive; "Other" allows custom entry where needed).
 */
import { ZAMBIA_PROVINCES, normalizeZambiaProvince } from '@/lib/platform/zambiaProvinces'

/** @type {Record<string, string[]>} */
export const DISTRICTS_BY_PROVINCE = {
  Central: [
    'Chibombo',
    'Chisamba',
    'Chitambo',
    'Kabwe',
    'Kapiri Mposhi',
    'Luano',
    'Mkushi',
    'Mumbwa',
    'Ngabwe',
    'Serenje',
    'Shibuyunji',
  ],
  Copperbelt: [
    'Chililabombwe',
    'Chingola',
    'Kalulushi',
    'Kitwe',
    'Luanshya',
    'Lufwanyama',
    'Masaiti',
    'Mpongwe',
    'Mufulira',
    'Ndola',
  ],
  Eastern: [
    'Chadiza',
    'Chama',
    'Chipata',
    'Katete',
    'Lundazi',
    'Mambwe',
    'Nyimba',
    'Petauke',
    'Sinda',
    'Vubwi',
  ],
  Luapula: [
    'Chembe',
    'Chiengi',
    'Chifunabuli',
    'Chipili',
    'Kawambwa',
    'Lunga',
    'Mansa',
    'Milenge',
    'Mwansabombwe',
    'Nchelenge',
    'Samfya',
  ],
  Lusaka: ['Chilanga', 'Chongwe', 'Kafue', 'Luangwa', 'Lusaka', 'Rufunsa'],
  Muchinga: ['Chinsali', 'Isoka', 'Mafinga', 'Mpika', 'Nakonde', 'Shiwangandu'],
  Northern: [
    'Chilubi',
    'Kaputa',
    'Kasama',
    'Luwingu',
    'Lupososhi',
    'Mbala',
    'Mporokoso',
    'Mpulungu',
    'Mungwi',
    'Nsama',
  ],
  'North-Western': [
    'Chavuma',
    'Ikelenge',
    'Kabompo',
    'Kasempa',
    'Manyinga',
    'Mufumbwe',
    'Mushindamo',
    'Mwandi',
    'Solwezi',
    'Zambezi',
  ],
  Southern: [
    'Chikankata',
    'Choma',
    'Gwembe',
    'Kalomo',
    'Kazungula',
    'Livingstone',
    'Mazabuka',
    'Monze',
    'Namwala',
    'Pemba',
    'Siavonga',
    'Sinazongwe',
    'Zimba',
  ],
  Western: [
    'Kalabo',
    'Kaoma',
    'Limulunga',
    'Luampa',
    'Lukulu',
    'Mitete',
    'Mongu',
    'Mulobezi',
    'Mwandi',
    'Nalolo',
    'Nkeyema',
    'Senanga',
    'Sesheke',
    'Shangombo',
    'Sikongo',
  ],
}

/**
 * @param {string} province
 * @returns {string[]}
 */
export function getDistrictsForProvince(province) {
  const p = normalizeZambiaProvince(province)
  if (!p) return []
  return DISTRICTS_BY_PROVINCE[p] || []
}

/**
 * @param {string} province
 * @param {string} district
 * @returns {boolean}
 */
export function isValidDistrictForProvince(province, district) {
  const d = String(district || '').trim()
  if (!d) return false
  const list = getDistrictsForProvince(province)
  if (!list.length) return d.length >= 2
  return list.some((x) => x.toLowerCase() === d.toLowerCase())
}

/**
 * @param {string} district
 * @param {string} province
 * @returns {string | null}
 */
export function normalizeDistrict(district, province) {
  const d = String(district || '').trim()
  if (!d) return null
  const list = getDistrictsForProvince(province)
  const match = list.find((x) => x.toLowerCase() === d.toLowerCase())
  return match || d
}

export { ZAMBIA_PROVINCES }
