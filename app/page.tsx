'use client'

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { TERMS_ARTICLES, TERMS_TITLE } from '@/lib/terms'
import useSWR from 'swr'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  ClipboardList,
  Copy,
  Database,
  FileText,
  Loader2,
  RotateCcw,
  Scale,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react'
import regionTreeData from '@/lib/region-tree.json'
import type { PropertyCategory, RegistryResult } from '@/app/api/building-registry/route'

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

type RegionTree = [string, string, [string, string][]][]
const REGION_TREE = regionTreeData as unknown as RegionTree

const PROPERTY_TYPES: PropertyCategory[] = [
  '단독주택',
  '공동주택',
  '준주택(오피스텔)',
  '근린생활시설(상가)',
  '업무시설(사무실)',
  '기타 비주거 건축물',
]
const RESIDENTIAL_TYPES = new Set<string>(['단독주택', '공동주택', '준주택(오피스텔)'])
const MULTI_UNIT_HOUSING = new Set<string>(['공동주택', '준주택(오피스텔)'])

const DEAL_TYPES = ['매매', '교환', '전세', '월세'] as const
type DealType = (typeof DEAL_TYPES)[number]

const DIRECTIONS = ['동', '서', '남', '북', '북동', '남동', '남서', '북서']
const DIRECTION_BASES = ['거실', '안방', '주된 출입구'] as const

const FEE_ITEMS = [
  ['general', '일반관리비'],
  ['electric', '전기료'],
  ['water', '수도료'],
  ['gas', '가스사용료'],
  ['heating', '난방비'],
  ['internet', '인터넷사용료'],
  ['tv', 'TV사용료'],
  ['etc', '기타관리비'],
] as const
type FeeItemKey = (typeof FEE_ITEMS)[number][0]

const DISCLAIMER =
  "본 플랫폼은 부동산 표시·광고 명시사항의 적합성 여부에 대한 자가진단을 도와주고 작성 편의성을 높이기 위해 개발된 사전참고용 자가진단 플랫폼입니다. 실제 표시·광고에 대한 모든 법적 책임은 작성자 본인에게 있으며, 본 플랫폼에서 '적합'으로 판정되더라도 허위매물, 거짓광고, 부당한 표시·광고 여부 전체에 대한 법적 적합성을 공적으로 보증하는 것이 아닙니다. 따라서 최종 광고 내용에 대한 검토 책임은 본인에게 있으며, 부당한 표시·광고 시 관련 법률에 따라 과태료 부과 대상이 될 수 있음을 유의하시기 바랍니다."

const LEDGER_NOTICE =
  '국토교통부 건축물대장 HUB 정상 연동이 완료되었습니다. 본 플랫폼은 공인중개사가 직접 발급 및 열람한 건축물대장을 토대로 광고 내용을 기입할 수 있도록 자가검증 편의성을 높이고 오기재를 방지하기 위해 고안된 보조 도구입니다. 연동 결과만을 100% 신뢰하지 마시고, 반드시 공인중개사가 직접 공적장부를 선행 확인·열람한 후 플랫폼을 이용하시기 바랍니다. (미확인으로 인한 오기재 및 법적 책임은 개업공인중개사 본인에게 있습니다.)'

const inputClass =
  'h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25 aria-invalid:border-destructive aria-invalid:ring-destructive/15 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground'

const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50'

const outlineButton =
  'inline-flex items-center justify-center gap-2 rounded-md border border-input bg-card px-4 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50'

/* ------------------------------------------------------------------ */
/* Form model                                                          */
/* ------------------------------------------------------------------ */

interface ListingForm {
  officeName: string
  officeAddress: string
  officePhone: string
  officeRegNo: string
  agentName: string
  location: string
  locationPrivate: boolean
  buildingDong: string
  noBuildingDong: boolean
  floor: string
  floorLevel: '' | '저층' | '중층' | '고층'
  exclusiveArea: string
  supplyArea: string
  areaUnverifiable: boolean
  measuredArea: string
  dealType: DealType | ''
  price: string
  monthlyRent: string
  propertyType: PropertyCategory | ''
  statusNormal: boolean
  statusUnregistered: boolean
  statusViolation: boolean
  totalFloors: string
  moveInMode: '' | 'date' | 'now' | 'negotiable'
  moveInDate: string
  moveInMonth: string
  moveInPeriod: '' | '초순' | '중순' | '하순'
  rooms: string
  baths: string
  approvalDate: string
  inspectionDate: string
  completionDate: string
  datesUnlocked: boolean
  parkingTotal: string
  parkingPerHousehold: string
  parkingActual: string
  feeExempt: boolean
  feeMode: '' | 'fixed' | 'average'
  feeTotal: string
  feeItems: Record<FeeItemKey, string>
  feeDetailUnavailable: boolean
  feeAverage: string
  feeIncluded: string
  direction: string
  directionBase: '' | (typeof DIRECTION_BASES)[number]
}

const EMPTY_FORM: ListingForm = {
  officeName: '',
  officeAddress: '',
  officePhone: '',
  officeRegNo: '',
  agentName: '',
  location: '',
  locationPrivate: false,
  buildingDong: '',
  noBuildingDong: false,
  floor: '',
  floorLevel: '',
  exclusiveArea: '',
  supplyArea: '',
  areaUnverifiable: false,
  measuredArea: '',
  dealType: '',
  price: '',
  monthlyRent: '',
  propertyType: '',
  statusNormal: false,
  statusUnregistered: false,
  statusViolation: false,
  totalFloors: '',
  moveInMode: '',
  moveInDate: '',
  moveInMonth: '',
  moveInPeriod: '',
  rooms: '',
  baths: '',
  approvalDate: '',
  inspectionDate: '',
  completionDate: '',
  datesUnlocked: true,
  parkingTotal: '',
  parkingPerHousehold: '',
  parkingActual: '',
  feeExempt: false,
  feeMode: '',
  feeTotal: '',
  feeItems: { general: '', electric: '', water: '', gas: '', heating: '', internet: '', tv: '', etc: '' },
  feeDetailUnavailable: false,
  feeAverage: '',
  feeIncluded: '',
  direction: '',
  directionBase: '',
}

const filled = (v: string) => v.trim() !== ''
const positive = (v: string) => filled(v) && Number(v) > 0
const nonNegativeInt = (v: string) => /^\d+$/.test(v.trim())

const isResidential = (f: ListingForm) => RESIDENTIAL_TYPES.has(f.propertyType)
const isMultiUnitHousing = (f: ListingForm) => MULTI_UNIT_HOUSING.has(f.propertyType)
const allowedBases = (f: ListingForm): readonly string[] =>
  !f.propertyType ? DIRECTION_BASES : isResidential(f) ? ['거실', '안방'] : ['주된 출입구']

const stripJibun = (address: string) => address.replace(/\s*(산\s*)?\d+(-\d+)?\s*(번지)?\s*$/, '').trim()

function floorLevelOf(floor: string, total: string): ListingForm['floorLevel'] {
  const f = Number(floor)
  const t = Number(total)
  if (!f || !t || f < 0) return ''
  const ratio = f / t
  return ratio <= 1 / 3 ? '저층' : ratio <= 2 / 3 ? '중층' : '고층'
}

function priceLabel(deal: ListingForm['dealType']) {
  if (deal === '매매') return '매매가'
  if (deal === '교환') return '교환가액'
  if (deal === '전세') return '전세보증금'
  if (deal === '월세') return '보증금'
  return '거래금액'
}

function formatMeasuredArea(value: string) {
  const core = value
    .trim()
    .replace(/^실측(면적)?\s*/, '')
    .replace(/\s*(㎡|m²|m2|제곱미터)$/i, '')
    .trim()
  return `실측 ${core}㎡`
}

function formatManwon(value: string) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n) || n <= 0) return '-'
  const eok = Math.floor(n / 10000)
  const rest = n % 10000
  return [eok ? `${eok.toLocaleString('ko-KR')}억` : '', rest ? `${rest.toLocaleString('ko-KR')}만` : ''].filter(Boolean).join(' ') + '원'
}

const won = (v: string) => `${Number(v || 0).toLocaleString('ko-KR')}원`

/* ------------------------------------------------------------------ */
/* Checklist & validation                                              */
/* ------------------------------------------------------------------ */

type CheckKey =
  | 'registry'
  | 'officeName'
  | 'officeAddress'
  | 'officePhone'
  | 'officeRegNo'
  | 'agentName'
  | 'location'
  | 'buildingDong'
  | 'floor'
  | 'area'
  | 'price'
  | 'propertyType'
  | 'propertyStatus'
  | 'dealType'
  | 'totalFloors'
  | 'moveIn'
  | 'rooms'
  | 'baths'
  | 'useDate'
  | 'parking'
  | 'fee'
  | 'direction'

interface CheckItem {
  key: CheckKey
  label: string
  group: string
  targetId: string
  done: boolean
  error: string
}

function buildChecklist(f: ListingForm, record: RegistryResult | null): CheckItem[] {
  const residential = isResidential(f)
  const multiUnit = isMultiUnitHousing(f)
  const items: (CheckItem & { applies: boolean })[] = []
  const add = (key: CheckKey, label: string, group: string, targetId: string, applies: boolean, done: boolean, error: string) =>
    items.push({ key, label, group, targetId, applies, done, error })

  add('registry', '건축물대장 조회', '공적장부', 'registry-lookup', true, Boolean(record), '건축물대장을 먼저 조회해 주세요.')

  add('officeName', '중개사무소 명칭', '중개사무소 (제3조)', 'f-officeName', true, filled(f.officeName), '등록된 중개사무소 명칭을 입력해 주세요.')
  add('officeAddress', '중개사무소 소재지', '중개사무소 (제3조)', 'f-officeAddress', true, filled(f.officeAddress), '등록된 사무소 소재지를 입력해 주세요.')
  const phoneOk = /^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(f.officePhone.trim())
  add('officePhone', '중개사무소 연락처', '중개사무소 (제3조)', 'f-officePhone', true, phoneOk, filled(f.officePhone) ? '전화번호 형식이 올바르지 않습니다. (예: 051-123-4567)' : '등록된 연락처를 입력해 주세요.')
  add('officeRegNo', '등록번호', '중개사무소 (제3조)', 'f-officeRegNo', true, filled(f.officeRegNo), '중개사무소 등록번호를 입력해 주세요.')
  add('agentName', '개업공인중개사 성명', '중개사무소 (제3조)', 'f-agentName', true, filled(f.agentName), '개업공인중개사 성명을 입력해 주세요.')

  const jibunOptional = f.propertyType === '단독주택' && f.locationPrivate
  const locationOk = filled(f.location) && (jibunOptional || /\d/.test(f.location))
  add('location', '소재지', '중개대상물 (제6조)', 'f-location', true, locationOk, !filled(f.location) ? '중개대상물 소재지를 입력해 주세요.' : '지번(번지)을 포함해 주세요. 비공개 요청 시에도 공동주택 등은 지번을 반드시 표시해야 합니다.')
  add('buildingDong', '건물 동', '중개대상물 (제6조)', 'f-buildingDong', multiUnit, filled(f.buildingDong) || f.noBuildingDong, '건물 동을 입력하거나 "동 구분 없음"을 선택해 주세요.')
  const floorApplies = Boolean(f.propertyType) && f.propertyType !== '단독주택'
  const floorDone = multiUnit && f.locationPrivate ? Boolean(f.floorLevel) : filled(f.floor)
  add('floor', '해당 층', '중개대상물 (제6조)', 'f-floor', floorApplies, floorDone, multiUnit && f.locationPrivate ? '저층/중층/고층 중 하나를 선택해 주세요.' : '해당 층을 입력해 주세요.')
  add('area', '면적', '중개대상물 (제6조)', 'f-exclusiveArea', true, f.areaUnverifiable ? filled(f.measuredArea) : positive(f.exclusiveArea), f.areaUnverifiable ? '실측면적을 입력해 주세요.' : '전용면적(㎡)을 입력해 주세요.')
  const priceOk = positive(f.price) && (f.dealType !== '월세' || positive(f.monthlyRent))
  add('price', '가격', '중개대상물 (제6조)', 'f-price', true, Boolean(f.dealType) && priceOk, !f.dealType ? '거래 형태를 먼저 선택한 뒤 가격을 입력해 주세요.' : f.dealType === '월세' ? '보증금과 월세를 모두 입력해 주세요.' : `${priceLabel(f.dealType)}을(를) 입력해 주세요.`)
  add('propertyType', '중개대상물 종류', '중개대상물 (제6조)', 'f-propertyType', true, Boolean(f.propertyType), '중개대상물 종류를 선택해 주세요.')
  add('propertyStatus', '건축물 상태 (미등기·위반)', '중개대상물 (제6조)', 'f-statusNormal', true, f.statusNormal || f.statusUnregistered || f.statusViolation, '해당없음/미등기건물/위반건축물 중 해당 항목을 선택해 주세요.')
  add('dealType', '거래 형태', '중개대상물 (제6조)', 'f-dealType', true, Boolean(f.dealType), '거래 형태를 선택해 주세요.')
  add('totalFloors', '총 층수', '중개대상물 (제6조)', 'f-totalFloors', true, positive(f.totalFloors), '총 층수를 입력해 주세요.')
  const moveInOk =
    f.moveInMode === 'now' ||
    (f.moveInMode === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(f.moveInDate)) ||
    (f.moveInMode === 'negotiable' && Boolean(f.moveInMonth) && Boolean(f.moveInPeriod))
  add('moveIn', '입주가능일', '중개대상물 (제6조)', 'f-moveIn', true, moveInOk, f.moveInMode === 'negotiable' ? '입주 가능 월과 시기(초순·중순·하순)를 선택해 주세요.' : f.moveInMode === 'date' ? '입주가능일을 YYYY-MM-DD 형식으로 입력해 주세요.' : '입주가능일 표시 방식을 선택해 주세요.')
  add('rooms', '방 수', '중개대상물 (제6조)', 'f-rooms', residential, nonNegativeInt(f.rooms), '방 수를 숫자로 입력해 주세요.')
  add('baths', '욕실 수', '중개대상물 (제6조)', 'f-baths', residential, nonNegativeInt(f.baths), '욕실 수를 숫자로 입력해 주세요.')
  add('useDate', '사용승인일 등', '중개대상물 (제6조)', 'f-approvalDate', true, filled(f.approvalDate) || filled(f.inspectionDate) || filled(f.completionDate), '사용승인일·사용검사일·준공인가일 중 하나를 입력해 주세요.')
  add('parking', '주차대수', '중개대상물 (제6조)', 'f-parkingTotal', true, nonNegativeInt(f.parkingTotal), '총 주차대수를 숫자로 입력해 주세요. (없으면 0)')

  let feeOk = false
  let feeError = '관리비 표시 방식을 선택해 주세요.'
  if (f.feeMode === 'fixed') {
    const itemsOk = f.feeDetailUnavailable || FEE_ITEMS.every(([k]) => nonNegativeInt(f.feeItems[k]))
    feeOk = Number(f.feeTotal) >= 100000 && itemsOk
    feeError = Number(f.feeTotal) < 100000 ? '월 정액 관리비 총액(10만원 이상)을 입력해 주세요.' : '8개 세부 항목을 모두 입력하거나 "확인 불가"를 선택해 주세요.'
  } else if (f.feeMode === 'average') {
    feeOk = nonNegativeInt(f.feeAverage)
    feeError = '월 평균 관리비를 원 단위 숫자로 입력해 주세요.'
  }
  add('fee', '관리비', '중개대상물 (제6조)', 'f-fee', residential || !f.feeExempt, feeOk, feeError)

  const baseOk = Boolean(f.directionBase) && allowedBases(f).includes(f.directionBase)
  add('direction', '방향 및 기준', '중개대상물 (제6조)', 'f-direction', true, Boolean(f.direction) && baseOk, !f.direction ? '방향을 선택해 주세요.' : '방향 기준을 선택해 주세요.')

  return items.filter((i) => i.applies).map(({ applies: _applies, ...rest }) => rest)
}

type MismatchKey = 'propertyType' | 'totalFloors' | 'parkingTotal' | 'approvalDate' | 'floor' | 'exclusiveArea'

function crossCheck(f: ListingForm, record: RegistryResult | null): Partial<Record<MismatchKey, string>> {
  if (!record) return {}
  const out: Partial<Record<MismatchKey, string>> = {}
  if (f.propertyType && f.propertyType !== record.category) {
    out.propertyType = `대장상 용도는 '${record.mainUse}'(${record.category})입니다. 실제 이용 현황이 다르다면 위반건축물 여부를 확인해 주세요.`
  }
  if (filled(f.totalFloors) && record.totalFloors > 0 && Number(f.totalFloors) !== record.totalFloors) {
    out.totalFloors = `대장상 지상 층수는 ${record.totalFloors}층입니다.`
  }
  if (filled(f.parkingTotal) && Number(f.parkingTotal) !== record.parkingTotal) {
    out.parkingTotal = `대장상 총 주차대수는 ${record.parkingTotal.toLocaleString('ko-KR')}대입니다. 실제와 다르면 "실제 사용가능한 주차대수"에 별도 기재해 주세요.`
  }
  if (record.approvalDate && filled(f.approvalDate) && f.approvalDate !== record.approvalDate) {
    out.approvalDate = `대장상 사용승인일은 ${record.approvalDate}입니다.`
  }
  if (record.unit && filled(f.floor) && !f.locationPrivate && f.floor.replace(/\s|층/g, '') !== record.unit.floor) {
    out.floor = `전유부상 ${record.unit.ho}는 ${record.unit.underground ? `지하 ${record.unit.floorNo}` : record.unit.floorNo}층입니다.`
  }
  if (record.unit && record.unit.exclusiveArea > 0 && !f.areaUnverifiable && positive(f.exclusiveArea) && Math.abs(Number(f.exclusiveArea) - record.unit.exclusiveArea) > 0.01) {
    out.exclusiveArea = `전유부상 전용면적은 ${record.unit.exclusiveArea}㎡입니다.`
  }
  return out
}

function buildTemplate(f: ListingForm, record: RegistryResult) {
  const multiUnit = isMultiUnitHousing(f)
  const floorText = !f.propertyType || f.propertyType === '단독주택' ? '' : multiUnit && f.locationPrivate ? f.floorLevel : `${f.floor.replace(/층$/, '')}층`
  const locationText = [f.location.trim(), multiUnit && !f.noBuildingDong ? `${f.buildingDong.replace(/동$/, '')}동` : '', floorText].filter(Boolean).join(' ')
  const status = [f.statusUnregistered && '미등기건물', f.statusViolation && '위반건축물'].filter(Boolean).join(', ')
  const price =
    f.dealType === '월세'
      ? `보증금 ${formatManwon(f.price)} / 월세 ${formatManwon(f.monthlyRent)}`
      : `${priceLabel(f.dealType)} ${formatManwon(f.price)}`
  const area = f.areaUnverifiable
    ? formatMeasuredArea(f.measuredArea)
    : `전용 ${f.exclusiveArea}㎡${positive(f.supplyArea) ? ` / 공급 ${f.supplyArea}㎡` : ''}`
  const moveIn =
    f.moveInMode === 'now' ? '즉시 입주' : f.moveInMode === 'date' ? f.moveInDate : `${f.moveInMonth} ${f.moveInPeriod} (협의 가능)`
  const dates = [
    filled(f.approvalDate) && `사용승인일 ${f.approvalDate}`,
    filled(f.inspectionDate) && `사용검사일 ${f.inspectionDate}`,
    filled(f.completionDate) && `준공인가일 ${f.completionDate}`,
  ].filter(Boolean)
  const parking = [
    `총 ${Number(f.parkingTotal).toLocaleString('ko-KR')}대`,
    filled(f.parkingPerHousehold) && `세대당 ${f.parkingPerHousehold}대`,
    filled(f.parkingActual) && `실제 사용가능 ${f.parkingActual}대`,
  ].filter(Boolean)

  let fee = '해당없음 (주택 외 건축물)'
  if (f.feeMode === 'fixed') {
    fee = `월 정액 ${won(f.feeTotal)}`
    fee += f.feeDetailUnavailable
      ? ' (중개의뢰인 세부내역 미제시로 확인 불가)'
      : `\n    - ${FEE_ITEMS.map(([k, label]) => `${label} ${won(f.feeItems[k])}`).join(', ')}`
  } else if (f.feeMode === 'average') {
    fee = `월 평균 ${won(f.feeAverage)}${filled(f.feeIncluded) ? ` (포함 항목: ${f.feeIncluded.trim()})` : ''}`
  }

  const lines = [
    '[중개사무소 정보]',
    `· 명칭: ${f.officeName.trim()}`,
    `· 소재지: ${f.officeAddress.trim()}`,
    `· 연락처: ${f.officePhone.trim()}`,
    `· 등록번호: ${f.officeRegNo.trim()}`,
    `· 개업공인중개사: ${f.agentName.trim()}`,
    '',
    '[중개대상물 정보]',
    `· 소재지: ${locationText}`,
    `· 면적: ${area}`,
    `· 가격: ${price}`,
    `· 종류: ${f.propertyType}${status ? ` (${status})` : ''}`,
    `· 거래형태: ${f.dealType}`,
    `· 총 층수: ${f.totalFloors}층`,
    `· 입주가능일: ${moveIn}`,
    ...(isResidential(f) ? [`· 방 수 / 욕실 수: ${f.rooms}개 / ${f.baths}개`] : []),
    `· ${dates.join(' · ')}`,
    `· 주차대수: ${parking.join(' · ')}`,
    `· 관리비: ${fee}`,
    `· 방향: ${f.direction}향 (${f.directionBase} 기준)`,
    '',
    `※ 건축물대장 조회 기준: ${record.address} · ${record.queriedAt}`,
  ]
  return lines.join('\n')
}

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

function InfoTip({ id, text }: { id: string; text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-describedby={id}
        aria-label="고시 세부 기준 보기"
        className="flex size-5 items-center justify-center rounded-full border border-input bg-card text-[11px] font-bold text-muted-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        ?
      </button>
      <span
        role="tooltip"
        id={id}
        className="pointer-events-none invisible absolute right-0 bottom-full z-40 mb-2 w-72 rounded-lg bg-popover p-3 text-xs leading-relaxed text-popover-foreground opacity-0 shadow-xl transition-opacity duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        <span className="mb-1 block font-semibold text-sky-200">국토교통부 고시 제2024-748호</span>
        {text}
      </span>
    </span>
  )
}

interface FieldProps {
  id: string
  label: string
  required?: boolean
  tooltip?: string
  guide?: ReactNode
  error?: string
  mismatch?: string
  onRestore?: () => void
  className?: string
  children: ReactNode
  asGroup?: boolean
}

function Field({ id, label, required, tooltip, guide, error, mismatch, onRestore, className = '', children, asGroup }: FieldProps) {
  const LabelTag = asGroup ? 'span' : 'label'
  return (
    <div className={`flex flex-col gap-1.5 ${className}`} role={asGroup ? 'group' : undefined} aria-labelledby={asGroup ? `${id}-label` : undefined}>
      <div className="flex items-center justify-between gap-2">
        <LabelTag id={`${id}-label`} htmlFor={asGroup ? undefined : id} className="text-sm font-medium text-foreground">
          {label}
          {required && (
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
          )}
          {required && <span className="sr-only">(필수)</span>}
        </LabelTag>
        {tooltip && <InfoTip id={`${id}-tip`} text={tooltip} />}
      </div>
      {guide && <p className="rounded-md bg-secondary px-2.5 py-1.5 text-xs leading-relaxed text-secondary-foreground">{guide}</p>}
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
      {mismatch && (
        <div role="alert" className="mt-1 flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-destructive">
          <p className="flex gap-2 text-xs leading-relaxed font-medium">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>공적장부 불일치: {mismatch}</span>
          </p>
          {onRestore && (
            <button
              type="button"
              onClick={onRestore}
              className="inline-flex h-7 items-center gap-1.5 self-end rounded-md bg-destructive px-2.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-destructive/30"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              대장 값으로 되돌리기
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ step, title, description, children }: { step: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-xs md:p-6" aria-labelledby={`section-${step}`}>
      <div className="mb-5 flex items-start gap-3 border-b pb-4">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-bold text-secondary-foreground">
          {step}
        </span>
        <div>
          <h3 id={`section-${step}`} className="font-bold text-foreground">
            {title}
          </h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function Check({
  id,
  checked,
  onChange,
  disabled,
  children,
}: {
  id?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <label className={`flex items-start gap-2 text-sm ${disabled ? 'cursor-not-allowed text-muted-foreground/60' : 'cursor-pointer text-foreground'}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-primary"
      />
      <span className="leading-snug">{children}</span>
    </label>
  )
}

function Radio({
  name,
  value,
  checked,
  onChange,
  disabled,
  id,
  children,
}: {
  name: string
  value: string
  checked: boolean
  onChange: (v: string) => void
  disabled?: boolean
  id?: string
  children: ReactNode
}) {
  return (
    <label
      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
        disabled
          ? 'cursor-not-allowed border-border bg-muted text-muted-foreground/60 line-through'
          : checked
            ? 'cursor-pointer border-primary bg-accent text-accent-foreground'
            : 'cursor-pointer border-input bg-card text-foreground hover:bg-muted'
      }`}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="size-4 accent-primary"
      />
      {children}
    </label>
  )
}

function UnitInput({ unit, className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { unit: string }) {
  return (
    <div className={`relative ${className}`}>
      <input {...props} className={`${inputClass} pr-12`} />
      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center rounded-r-md border-l border-input bg-muted px-3 text-sm font-medium text-muted-foreground">
        {unit}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Header & statistics                                                 */
/* ------------------------------------------------------------------ */

interface Stats {
  verified: number
  found: number
  fixed: number
}

const EMPTY_STATS: Stats = { verified: 0, found: 0, fixed: 0 }

async function fetchStats(url: string): Promise<Stats> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('stats unavailable')
  return res.json()
}

async function postStats(type: 'issues' | 'verified', count: number): Promise<Stats> {
  const res = await fetch('/api/stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, count }),
  })
  if (!res.ok) throw new Error('stats not saved')
  return res.json()
}

function StatsCard({ stats, pulse, loading }: { stats: Stats; pulse: number; loading: boolean }) {
  const rate = stats.found ? (stats.fixed / stats.found) * 100 : null
  return (
    <aside aria-label="금일 자가진단 통계 요약" className="w-full shrink-0 rounded-xl bg-card p-4 text-card-foreground shadow-lg md:w-72">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
          <BarChart3 className="size-3.5 text-primary" aria-hidden="true" />
          금일 자가진단 통계 요약
        </h2>
        <span className="flex items-center gap-1 text-[10px] font-medium text-success">
          <span className="size-1.5 animate-pulse rounded-full bg-success" aria-hidden="true" />
          실시간
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3" aria-live="polite">
        <div className="rounded-lg bg-muted p-3">
          <dt className="text-[11px] text-muted-foreground">금일 플랫폼 검증 건수</dt>
          <dd key={`v-${pulse}`} className="mt-0.5 text-xl font-bold text-primary tabular-nums animate-in fade-in zoom-in-95 duration-500">
            {loading ? '–' : stats.verified.toLocaleString('ko-KR')}
            <span className="ml-0.5 text-xs font-medium text-muted-foreground">건</span>
          </dd>
        </div>
        <div className="rounded-lg bg-muted p-3">
          <dt className="text-[11px] text-muted-foreground">오기재 방지율</dt>
          <dd key={`r-${pulse}`} className="mt-0.5 text-xl font-bold text-success tabular-nums animate-in fade-in zoom-in-95 duration-500">
            {loading || rate === null ? '–' : rate.toFixed(1)}
            <span className="ml-0.5 text-xs font-medium text-muted-foreground">%</span>
          </dd>
        </div>
      </dl>
      <div className="mt-3" aria-hidden="true">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-success transition-all duration-700" style={{ width: `${rate ?? 0}%` }} />
        </div>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        {loading
          ? '통계를 불러오는 중입니다.'
          : stats.found
            ? `발견된 오기재 ${stats.found.toLocaleString('ko-KR')}건 중 ${stats.fixed.toLocaleString('ko-KR')}건 수정 후 검증 완료`
            : '오늘 발견된 오기재가 아직 없습니다.'}
      </p>
    </aside>
  )
}

function Header({ stats, pulse, loading }: { stats: Stats; pulse: number; loading: boolean }) {
  return (
    <header className="bg-primary text-primary-foreground">
      <div className="border-b border-primary-foreground/10 bg-foreground/15">
        <div className="mx-auto flex max-w-7xl items-center justify-end px-4 py-2 text-xs text-primary-foreground/80 md:px-6">
          <span className="flex items-center gap-1.5">
            <Scale className="size-3.5" aria-hidden="true" />
            공인중개사법 제18조의2 · 국토교통부 고시 제2024-748호
          </span>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:flex-row md:items-end md:justify-between md:px-6 md:py-10">
        <div className="max-w-3xl">
          <p className="mb-2 inline-flex rounded-full bg-primary-foreground/10 px-2.5 py-1 text-xs font-medium text-sky-100">
            중개대상물 표시광고 검증 플랫폼
          </p>
          <h1 className="text-2xl leading-snug font-bold break-keep text-balance md:text-3xl">
            중개대상물 표시광고 명시사항 사전 자가진단 및 행정처분 예방 시스템
          </h1>
        </div>
        <StatsCard stats={stats} pulse={pulse} loading={loading} />
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ */
/* Building ledger lookup                                              */
/* ------------------------------------------------------------------ */

interface LookupQuery {
  dong: string
  ho: string
}

function LedgerLookup({
  record,
  highlight,
  onLoaded,
}: {
  record: RegistryResult | null
  highlight: boolean
  onLoaded: (record: RegistryResult, query: LookupQuery) => void
}) {
  const [sido, setSido] = useState('')
  const [sigungu, setSigungu] = useState('')
  const [bjdong, setBjdong] = useState('')
  const [dongOptions, setDongOptions] = useState<[string, string][]>([])
  const [dongsLoading, setDongsLoading] = useState(false)
  const [mountain, setMountain] = useState(false)
  const [bun, setBun] = useState('')
  const [ji, setJi] = useState('')
  const [buildingDong, setBuildingDong] = useState('')
  const [ho, setHo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dongCache = useRef(new Map<string, [string, string][]>())

  const sigunguOptions = REGION_TREE.find(([code]) => code === sido)?.[2] ?? []

  async function handleSigungu(code: string) {
    setSigungu(code)
    setBjdong('')
    setDongOptions([])
    if (!code) return
    const cached = dongCache.current.get(code)
    if (cached) {
      setDongOptions(cached)
      return
    }
    setDongsLoading(true)
    try {
      const res = await fetch(`/api/regions?sigungu=${code}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      dongCache.current.set(code, data.dongs)
      setDongOptions(data.dongs)
    } catch {
      setError('읍·면·동 목록을 불러오지 못했습니다. 다시 선택해 주세요.')
    } finally {
      setDongsLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!sido || !sigungu || !bjdong) return setError('시·도, 시·군·구, 읍·면·동을 모두 선택해 주세요.')
    if (!/^\d{1,4}$/.test(bun) || Number(bun) === 0) return setError('본번을 숫자로 입력해 주세요.')
    if (ji && !/^\d{1,4}$/.test(ji)) return setError('부번은 숫자로 입력해 주세요.')

    setError(null)
    setLoading(true)
    const params = new URLSearchParams({ sigunguCd: sigungu, bjdongCd: bjdong, bun, ji: ji || '0', mountain: mountain ? '1' : '0' })
    if (buildingDong.trim()) params.set('dong', buildingDong.trim())
    if (ho.trim()) params.set('ho', ho.trim())
    try {
      const res = await fetch(`/api/building-registry?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onLoaded(data as RegistryResult, { dong: buildingDong.trim(), ho: ho.trim() })
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : '조회 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  const selectClass = `${inputClass} appearance-none`

  return (
    <section
      id="registry-lookup"
      tabIndex={-1}
      aria-labelledby="lookup-title"
      className={`scroll-mt-6 rounded-xl border bg-card p-5 shadow-xs transition-shadow focus:outline-none md:p-6 ${highlight ? 'ring-3 ring-destructive/40' : ''}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Database className="size-5 text-primary" aria-hidden="true" />
          <h2 id="lookup-title" className="font-bold">
            국토교통부 건축물대장 HUB 조회
          </h2>
        </div>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
          전국 17개 시·도 · 지번 주소 기준
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3" noValidate>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lk-sido" className="text-xs font-medium text-muted-foreground">
              시·도
            </label>
            <select
              id="lk-sido"
              value={sido}
              onChange={(e) => {
                setSido(e.target.value)
                setSigungu('')
                setBjdong('')
                setDongOptions([])
              }}
              className={selectClass}
            >
              <option value="">시·도 선택</option>
              {REGION_TREE.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lk-sigungu" className="text-xs font-medium text-muted-foreground">
              시·군·구
            </label>
            <select id="lk-sigungu" value={sigungu} onChange={(e) => handleSigungu(e.target.value)} disabled={!sido} className={selectClass}>
              <option value="">시·군·구 선택</option>
              {sigunguOptions.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lk-dong" className="text-xs font-medium text-muted-foreground">
              읍·면·동(리)
            </label>
            <select id="lk-dong" value={bjdong} onChange={(e) => setBjdong(e.target.value)} disabled={!sigungu || dongsLoading} className={selectClass}>
              <option value="">{dongsLoading ? '불러오는 중...' : '읍·면·동 선택'}</option>
              {dongOptions.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[auto_1fr_1fr_1fr_1fr_auto] sm:items-end">
          <label className="col-span-2 flex h-10 items-center gap-2 text-sm sm:col-span-1">
            <input type="checkbox" checked={mountain} onChange={(e) => setMountain(e.target.checked)} className="size-4 accent-primary" />
            산
          </label>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lk-bun" className="text-xs font-medium text-muted-foreground">
              본번 <span className="text-destructive">*</span>
            </label>
            <input id="lk-bun" inputMode="numeric" value={bun} onChange={(e) => setBun(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="123" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lk-ji" className="text-xs font-medium text-muted-foreground">
              부번
            </label>
            <input id="lk-ji" inputMode="numeric" value={ji} onChange={(e) => setJi(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="4" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lk-bdong" className="text-xs font-medium text-muted-foreground">
              동 (선택)
            </label>
            <input id="lk-bdong" value={buildingDong} onChange={(e) => setBuildingDong(e.target.value.slice(0, 20))} placeholder="101동" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lk-ho" className="text-xs font-medium text-muted-foreground">
              호 (선택)
            </label>
            <input id="lk-ho" value={ho} onChange={(e) => setHo(e.target.value.slice(0, 20))} placeholder="1203호" className={inputClass} />
          </div>
          <button type="submit" disabled={loading} className={`${primaryButton} col-span-2 h-10 sm:col-span-1`}>
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Search className="size-4" aria-hidden="true" />}
            {loading ? '조회 중...' : '건축물대장 조회'}
          </button>
        </div>
      </form>

      {error ? (
        <p role="alert" className="mt-3 text-xs font-medium text-destructive">
          {error}
        </p>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          호수를 입력하면 전유부에서 해당 층과 전용면적까지 자동으로 채워집니다. 조회 결과는 아래 입력 폼에 자동 반영됩니다.
        </p>
      )}

      {record && (
        <div className="mt-4 flex flex-col gap-3" aria-live="polite">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-success/30 bg-success/5 px-3 py-2.5 text-sm">
            <span className="flex items-center gap-1.5 font-medium text-success">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              연동 완료 · 자동 입력됨
            </span>
            <span className="text-muted-foreground">
              {record.address}
              {record.buildingName ? ` · ${record.buildingName}` : ''}
              {record.unit ? ` · ${record.unit.dong ? `${record.unit.dong}동 ` : ''}${record.unit.ho}` : ''}
            </span>
          </div>
          {record.unitWarning && (
            <p role="alert" className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs leading-relaxed text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {record.unitWarning} 층·면적은 직접 입력해 주세요.
            </p>
          )}
          <p className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
            <span>{LEDGER_NOTICE}</span>
          </p>
        </div>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Checklist drawer                                                    */
/* ------------------------------------------------------------------ */

function ChecklistPanel({ items, onJump }: { items: CheckItem[]; onJump: (item: CheckItem) => void }) {
  const done = items.filter((i) => i.done).length
  const percent = items.length ? Math.round((done / items.length) * 100) : 0
  const groups = [...new Set(items.map((i) => i.group))]

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <ClipboardList className="size-4 text-primary" aria-hidden="true" />
            명시사항 체크리스트
          </h2>
          <span className="text-xs font-bold text-primary tabular-nums">
            {done}/{items.length}
          </span>
        </div>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="명시사항 입력 진행률"
        >
          <div className={`h-full rounded-full transition-all duration-500 ${percent === 100 ? 'bg-success' : 'bg-primary'}`} style={{ width: `${percent}%` }} />
        </div>
      </div>
      {groups.map((group) => (
        <div key={group} className="flex flex-col gap-1">
          <p className="px-1 text-[11px] font-bold text-muted-foreground">{group}</p>
          <ul className="flex flex-col">
            {items
              .filter((i) => i.group === group)
              .map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => onJump(item)}
                    className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    {item.done ? (
                      <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
                    ) : (
                      <Circle className="size-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />
                    )}
                    <span className={`flex-1 ${item.done ? 'text-foreground' : 'text-muted-foreground'}`}>{item.label}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${item.done ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}
                    >
                      {item.done ? '완료' : '미입력'}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Disclaimer modal & template                                         */
/* ------------------------------------------------------------------ */

function DisclaimerModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const [agreed, setAgreed] = useState(false)
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-sm"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="disclaimer-title" className="w-full max-w-lg rounded-xl bg-card text-card-foreground shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 id="disclaimer-title" className="flex items-center gap-2 font-bold">
            <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
            법적 책임 고지 및 최종 확인
          </h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex flex-col gap-4 px-5 py-5">
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">{DISCLAIMER}</p>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-input p-3 text-sm font-medium has-checked:border-primary has-checked:bg-accent">
            <input autoFocus type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-primary" />
            위 ���내사항을 확인하였으며, 법적 책임이 본인에게 있음을 동의합니다
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <button type="button" onClick={onClose} className={`${outlineButton} h-10`}>
            취소
          </button>
          <button type="button" onClick={onConfirm} disabled={!agreed} className={`${primaryButton} h-10`}>
            <FileText className="size-4" aria-hidden="true" />
            동의 및 광고문구 생성
          </button>
        </div>
      </div>
    </div>
  )
}

function TermsGateModal({ onAccept }: { onAccept: () => void }) {
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/60 p-3 backdrop-blur-sm md:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-gate-title"
        aria-describedby="terms-gate-desc"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-xl bg-card text-card-foreground shadow-2xl"
      >
        <div className="flex flex-col gap-1 border-b px-5 py-4 md:px-6">
          <h2 id="terms-gate-title" className="flex items-center gap-2 text-lg font-bold">
            <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
            이용약관 및 법적 책임 고지
          </h2>
          <p id="terms-gate-desc" className="text-sm leading-relaxed text-muted-foreground">
            자가진단 플랫폼을 이용하시려면 아래 약관 전문을 확인하고 동의해 주세요.
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 px-5 py-4 md:px-6">
          <div
            tabIndex={0}
            autoFocus
            role="region"
            aria-label="이용약관 및 법적 책임 고지 전문"
            className="min-h-48 flex-1 overflow-y-auto rounded-lg border border-input bg-muted/50 p-4 text-sm leading-relaxed focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <h3 className="mb-4 text-center font-bold text-pretty">&lt;{TERMS_TITLE}&gt;</h3>
            <div className="flex flex-col gap-4">
              {TERMS_ARTICLES.map((article) => (
                <section key={article.title} className="flex flex-col gap-1">
                  <h4 className="font-bold">{article.title}</h4>
                  {article.clauses.map((clause) => (
                    <p key={clause} className="text-pretty text-foreground/85">
                      {clause}
                    </p>
                  ))}
                </section>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-input p-3 text-sm font-medium has-checked:border-primary has-checked:bg-accent">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-primary" />
            <span>
              <span className="font-bold text-destructive">[필수]</span> 위 이용약관 및 법적 책임 고지 내용을 확인하였으며, 이에 동의합니다.
            </span>
          </label>
        </div>

        <div className="border-t px-5 py-4 md:px-6">
          <button type="button" onClick={onAccept} disabled={!agreed} className={`${primaryButton} h-11 w-full`}>
            <ClipboardCheck className="size-4" aria-hidden="true" />
            확인 및 자가진단 시작하기
          </button>
        </div>
      </div>
    </div>
  )
}

function AdTemplate({ text, sectionRef }: { text: string; sectionRef: React.Ref<HTMLElement> }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <section ref={sectionRef} tabIndex={-1} aria-labelledby="template-title" className="scroll-mt-6 rounded-xl border-2 border-success/40 bg-card p-5 shadow-xs focus:outline-none md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="template-title" className="flex items-center gap-2 font-bold text-success">
          <ClipboardCheck className="size-5" aria-hidden="true" />
          명시사항 자가진단 완료 · 광고 명시사항 표준 문구
        </h2>
        <button type="button" onClick={copy} className={`${outlineButton} h-9`}>
          <Copy className="size-4" aria-hidden="true" />
          {copied ? '복사됨' : '문구 복사'}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap text-foreground">{text}</pre>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function focusTarget(id: string) {
  const el = document.getElementById(id)
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el?.focus({ preventScroll: true })
}

export default function Page() {
  const [form, setForm] = useState<ListingForm>(EMPTY_FORM)
  const [record, setRecord] = useState<RegistryResult | null>(null)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [template, setTemplate] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [lookupKey, setLookupKey] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const { data: statsData, isLoading: statsLoading, mutate: mutateStats } = useSWR<Stats>('/api/stats', fetchStats, {
    refreshInterval: 30_000,
  })
  const stats = statsData ?? EMPTY_STATS
  const [pulse, setPulse] = useState(0)

  async function reportStats(type: 'issues' | 'verified', count: number) {
    try {
      const next = await postStats(type, count)
      await mutateStats(next, { revalidate: false })
      setPulse((p) => p + 1)
    } catch {
      await mutateStats()
    }
  }
  const pendingIssues = useRef(new Set<string>())
  const templateRef = useRef<HTMLElement>(null)

  const checklist = buildChecklist(form, record)
  const mismatches = crossCheck(form, record)
  const errorFor = (key: CheckKey) => (submitAttempted ? checklist.find((c) => c.key === key && !c.done)?.error : undefined)
  const residential = isResidential(form)
  const multiUnit = isMultiUnitHousing(form)
  const bases = allowedBases(form)

  function patch(next: Partial<ListingForm>) {
    setForm((prev) => {
      const merged = { ...prev, ...next }
      if (merged.directionBase && !allowedBases(merged).includes(merged.directionBase)) merged.directionBase = ''
      return merged
    })
    setTemplate(null)
    setNotice(null)
  }

  function handleLoaded(next: RegistryResult, query: LookupQuery) {
    setRecord(next)
    setNotice(null)
    setTemplate(null)
    setForm((prev) => {
      const unit = next.unit
      const merged: ListingForm = {
        ...prev,
        location: prev.propertyType === '단독주택' && prev.locationPrivate ? stripJibun(next.address) : next.address,
        propertyType: next.category,
        totalFloors: next.totalFloors ? String(next.totalFloors) : '',
        parkingTotal: String(next.parkingTotal),
        parkingPerHousehold: next.parkingPerHousehold != null ? String(next.parkingPerHousehold) : '',
        approvalDate: next.approvalDate,
        inspectionDate: '',
        completionDate: '',
        datesUnlocked: !next.approvalDate,
        buildingDong: (unit?.dong || query.dong).replace(/동$/, '') || prev.buildingDong,
        noBuildingDong: next.singleBuilding && !(unit?.dong || query.dong),
        floor: unit ? unit.floor : prev.floor,
        exclusiveArea: unit && unit.exclusiveArea > 0 ? String(unit.exclusiveArea) : prev.exclusiveArea,
        areaUnverifiable: unit && unit.exclusiveArea > 0 ? false : prev.areaUnverifiable,
      }
      if (merged.locationPrivate && unit && !unit.underground) merged.floorLevel = floorLevelOf(unit.floor, merged.totalFloors)
      if (merged.directionBase && !allowedBases(merged).includes(merged.directionBase)) merged.directionBase = ''
      return merged
    })
  }

  function restore(key: MismatchKey) {
    if (!record) return
    const values: Record<MismatchKey, Partial<ListingForm>> = {
      propertyType: { propertyType: record.category },
      totalFloors: { totalFloors: String(record.totalFloors) },
      parkingTotal: { parkingTotal: String(record.parkingTotal) },
      approvalDate: { approvalDate: record.approvalDate },
      floor: { floor: record.unit?.floor ?? '' },
      exclusiveArea: { exclusiveArea: String(record.unit?.exclusiveArea ?? '') },
    }
    patch(values[key])
  }

  function jump(item: CheckItem) {
    setDrawerOpen(false)
    requestAnimationFrame(() => focusTarget(item.targetId))
  }

  function handleVerify() {
    setSubmitAttempted(true)
    const missing = checklist.filter((c) => !c.done)
    const mismatchKeys = Object.keys(mismatches)
    const issues = [...missing.map((m) => `missing:${m.key}`), ...mismatchKeys.map((k) => `mismatch:${k}`)]
    const newIssues = issues.filter((i) => !pendingIssues.current.has(i))
    if (newIssues.length) {
      newIssues.forEach((i) => pendingIssues.current.add(i))
      void reportStats('issues', newIssues.length)
    }

    if (missing.length) {
      setNotice(`필수 명시사항 ${missing.length}건이 누락되었거나 올바르지 않습니다.`)
      focusTarget(missing[0].targetId)
      return
    }
    if (mismatchKeys.length) {
      setNotice(`공적장부와 불일치하는 항목 ${mismatchKeys.length}건이 있습니다. 대장 내용을 확인 후 수정해 주세요.`)
      focusTarget(`f-${mismatchKeys[0]}`)
      return
    }
    setNotice(null)
    setModalOpen(true)
  }

  function handleConfirm() {
    if (!record) return
    setModalOpen(false)
    setTemplate(buildTemplate(form, record))
    const fixed = pendingIssues.current.size
    pendingIssues.current.clear()
    void reportStats('verified', fixed)
    requestAnimationFrame(() => {
      templateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      templateRef.current?.focus({ preventScroll: true })
    })
  }

  function handleReset() {
    setForm(EMPTY_FORM)
    setRecord(null)
    setSubmitAttempted(false)
    setTemplate(null)
    setNotice(null)
    setLookupKey((k) => k + 1)
    pendingIssues.current.clear()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const doneCount = checklist.filter((c) => c.done).length
  const mismatchCount = Object.keys(mismatches).length
  const ledgerHint = record ? '건축물대장 자동 입력' : undefined
  const autoBadge = (show: boolean) =>
    show ? <span className="ml-1.5 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">대장 자동입력</span> : null

  return (
    <>
    <div className="min-h-screen" inert={!termsAccepted}>
      <Header stats={stats} pulse={pulse} loading={statsLoading && !statsData} />

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-8 md:px-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <main className="flex min-w-0 flex-col gap-5">
          <LedgerLookup key={lookupKey} record={record} onLoaded={handleLoaded} highlight={!record && submitAttempted} />

          <div className="flex flex-col gap-1 pt-3">
            <h2 className="text-lg font-bold">국토교통부 고시 제2024-748호 준수 통합 입력 폼</h2>
            <p className="text-sm text-muted-foreground">
              <span className="text-destructive">*</span> 표시는 필수 명시사항입니다. 파란 안내 박스의 기준을 확인하고, 세부 기준은{' '}
              <span className="inline-flex size-4 items-center justify-center rounded-full border text-[10px] font-bold">?</span> 버튼에서 확인하세요.
            </p>
          </div>

          {/* 제3조 중개사무소 */}
          <Section step="1" title="중개사무소 명시사항 (제3조)" description="중개사무소 개설등록 사항과 동일하게 기재해야 합니다.">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field id="f-officeName" label="중개사무소 명칭" required guide="등록된 명칭 그대로 기재 (예: 홍길동공인중개사). '사무소'·'법인사무소'는 생략 가능" error={errorFor('officeName')} tooltip="중개사무소 개설등록증에 기재된 명칭을 표시합니다. 명칭 중 '공인중개사사무소', '법인사무소' 문자는 생략할 수 있습니다.">
                <input id="f-officeName" value={form.officeName} onChange={(e) => patch({ officeName: e.target.value })} placeholder="홍길동공인중개사" className={inputClass} aria-invalid={Boolean(errorFor('officeName'))} />
              </Field>
              <Field id="f-officeAddress" label="중개사무소 소재지" required guide="등록된 소재지 기재. 지번·건물번호 생략 가능, 시·구 명칭 축약 가능" error={errorFor('officeAddress')} tooltip="중개사무소 개설등록증상 소재지를 표시하되, 지번 또는 건물번호 이하는 생략할 수 있습니다.">
                <input id="f-officeAddress" value={form.officeAddress} onChange={(e) => patch({ officeAddress: e.target.value })} placeholder="서울 강남구 대치동" className={inputClass} aria-invalid={Boolean(errorFor('officeAddress'))} />
              </Field>
              <Field id="f-officePhone" label="중개사무소 연락처" required guide="등록관청에 신고된 전화번호만 기재. 중개보조원 연락처 단독 표시 금지" error={errorFor('officePhone')} tooltip="중개보조원에 관한 사항은 명시해서는 안 됩니다. 중개보조원 정보는 개업공인중개사 책임 하에 있음을 명확히 표시한 경우에만 예외적으로 허용됩니다.">
                <input id="f-officePhone" type="tel" value={form.officePhone} onChange={(e) => patch({ officePhone: e.target.value })} placeholder="02-123-4567" className={inputClass} aria-invalid={Boolean(errorFor('officePhone'))} />
              </Field>
              <Field id="f-officeRegNo" label="등록번호" required guide="중개사무소 개설등록증의 공식 등록번호" error={errorFor('officeRegNo')}>
                <input id="f-officeRegNo" value={form.officeRegNo} onChange={(e) => patch({ officeRegNo: e.target.value })} placeholder="11680-2024-00001" className={inputClass} aria-invalid={Boolean(errorFor('officeRegNo'))} />
              </Field>
              <Field id="f-agentName" label="개업공인중개사 성명" required guide="법인인 경우 대표자 성명 (공인중��사법 제18조의2)" error={errorFor('agentName')} className="md:col-span-2">
                <input id="f-agentName" value={form.agentName} onChange={(e) => patch({ agentName: e.target.value })} placeholder="홍길동" className={`${inputClass} md:max-w-sm`} aria-invalid={Boolean(errorFor('agentName'))} />
              </Field>
            </div>
          </Section>

          {/* 제6조 소재지·면적·가격 */}
          <Section step="2" title="소재지 · 면적 · 가격 (제6조)" description="건축물 및 인터넷 표시·광고 명시사항입니다.">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field
                id="f-location"
                label="소재지"
                required
                className="md:col-span-2"
                error={errorFor('location')}
                tooltip="단독주택은 지번까지 표시하되 중개의뢰인 요청 시 읍·면·동·리까지 표시할 수 있습니다. 그 밖의 주택·준주택은 지번, 동, 층수를 표시하되 의뢰인 요청 시 층수를 저층·중층·고층으로 갈음할 수 있습니다."
                guide={
                  form.propertyType === '단독주택'
                    ? '단독주택: 지번까지 표시 필수. 중개의뢰인이 비공개를 요청한 경우에만 읍·면·동·리까지 표시할 수 있습니다.'
                    : multiUnit
                      ? '공동주택·오피스텔 등: 지번 + 동 + 층수 표시 필수. 비공개 요청 시에도 지번과 동은 반드시 표시하고, 층수만 저층/중층/고층으로 대체할 수 있습니다.'
                      : '지번(번지)까지 표시합니다. 건축물대장 조회 시 자동 입력됩니다.'
                }
              >
                <input id="f-location" value={form.location} onChange={(e) => patch({ location: e.target.value })} placeholder="서울특별시 강남구 대치동 316" className={inputClass} aria-invalid={Boolean(errorFor('location'))} />
                {(form.propertyType === '단독주택' || multiUnit) && (
                  <Check
                    checked={form.locationPrivate}
                    onChange={(v) => {
                      if (form.propertyType === '단독주택') {
                        patch({ locationPrivate: v, location: v ? stripJibun(form.location) : record?.address ?? form.location })
                      } else {
                        patch({ locationPrivate: v, floorLevel: v ? floorLevelOf(form.floor, form.totalFloors) : '' })
                      }
                    }}
                  >
                    중개의뢰인 비공개 요청{' '}
                    <span className="text-xs text-muted-foreground">
                      {form.propertyType === '단독주택' ? '(읍·면·동·리까지 표시)' : '(층수를 저층/중층/고층으로 표시 · 지번은 반드시 포함)'}
                    </span>
                  </Check>
                )}
              </Field>

              {multiUnit && (
                <Field id="f-buildingDong" label="건물 동" required guide="대장상 동 명칭 (예: 101동). 비공개 요청 시에도 표시 필수" error={errorFor('buildingDong')}>
                  <UnitInput unit="동" id="f-buildingDong" value={form.buildingDong} onChange={(e) => patch({ buildingDong: e.target.value.replace(/동$/, '') })} disabled={form.noBuildingDong} placeholder="101" aria-invalid={Boolean(errorFor('buildingDong'))} />
                  <Check checked={form.noBuildingDong} onChange={(v) => patch({ noBuildingDong: v, buildingDong: v ? '' : form.buildingDong })}>
                    동 구분 없음 (단일 동 건축물)
                  </Check>
                </Field>
              )}

              {form.propertyType && form.propertyType !== '단독주택' && (
                <Field
                  id="f-floor"
                  label={multiUnit && form.locationPrivate ? '해당 층 (비공개 표시)' : '해당 층'}
                  required
                  guide={multiUnit && form.locationPrivate ? '비공개 요청: 저층/중층/고층 중 선택' : record?.unit ? '전유부 호수 기준 자동 입력' : '호수 입력 후 조회하면 자동 입력됩니다. 지하층은 "지하1"로 입력'}
                  error={errorFor('floor')}
                  mismatch={mismatches.floor}
                  onRestore={() => restore('floor')}
                >
                  {multiUnit && form.locationPrivate ? (
                    <select id="f-floor" value={form.floorLevel} onChange={(e) => patch({ floorLevel: e.target.value as ListingForm['floorLevel'] })} className={inputClass} aria-invalid={Boolean(errorFor('floor'))}>
                      <option value="">선택</option>
                      <option value="저층">저층</option>
                      <option value="중층">중층</option>
                      <option value="고층">고층</option>
                    </select>
                  ) : (
                    <UnitInput unit="층" id="f-floor" value={form.floor} onChange={(e) => patch({ floor: e.target.value })} placeholder="12" aria-invalid={Boolean(errorFor('floor'))} />
                  )}
                </Field>
              )}

              <Field
                id="f-exclusiveArea"
                label="전용면적"
                required
                guide="면적은 반드시 ㎡ 단위로 표시 (평 단위 단독 표시 불가)"
                error={errorFor('area')}
                mismatch={mismatches.exclusiveArea}
                onRestore={() => restore('exclusiveArea')}
                tooltip="건축물대장에 기재된 전용면적을 ㎡로 표시합니다. 대장상 면적 확인이 곤란한 경우 실측면적 등을 표시할 수 있습니다."
              >
                <UnitInput unit="㎡" id="f-exclusiveArea" type="number" min="0" step="0.01" inputMode="decimal" value={form.exclusiveArea} onChange={(e) => patch({ exclusiveArea: e.target.value })} disabled={form.areaUnverifiable} placeholder="84.43" aria-invalid={Boolean(errorFor('area'))} />
                <Check checked={form.areaUnverifiable} onChange={(v) => patch({ areaUnverifiable: v })}>
                  대장상 면적 확인 어려움 (실측면적 기재)
                </Check>
                {form.areaUnverifiable && (
                  <UnitInput unit="㎡" id="f-measuredArea" aria-label="실측면적" inputMode="decimal" value={form.measuredArea} onChange={(e) => patch({ measuredArea: e.target.value })} placeholder="84.98" />
                )}
              </Field>

              <Field id="f-supplyArea" label="공급면적 (선택)" guide={record?.unit && record.unit.commonArea > 0 ? `전유부상 공용면적 합계 ${record.unit.commonArea}㎡ (주차장 등 포함 여부 확인 필요)` : '공급면적을 함께 표시하는 경우 ㎡로 기재'}>
                <UnitInput unit="㎡" id="f-supplyArea" type="number" min="0" step="0.01" inputMode="decimal" value={form.supplyArea} onChange={(e) => patch({ supplyArea: e.target.value })} placeholder="114.5" />
              </Field>

              <Field id="f-dealType" label="거래 형태" required error={errorFor('dealType')} guide="매매 / 교환 / 전세 / 월세 중 선택">
                <select id="f-dealType" value={form.dealType} onChange={(e) => patch({ dealType: e.target.value as DealType })} className={inputClass} aria-invalid={Boolean(errorFor('dealType'))}>
                  <option value="">선택</option>
                  {DEAL_TYPES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>

              <Field id="f-price" label={`가격 · ${priceLabel(form.dealType)}`} required error={errorFor('price')} guide="거래형태에 따른 단일 가격 표시 (만원 단위). 범위·'~부터' 표시 금지" tooltip="중개대상물의 가격은 단일 가격으로 표시해야 하며, 임대차의 경우 보증금과 차임(월세)을 구분하여 표시합니다.">
                <div className={`grid gap-2 ${form.dealType === '월세' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <UnitInput unit="만원" id="f-price" type="number" min="0" inputMode="numeric" value={form.price} onChange={(e) => patch({ price: e.target.value })} placeholder={form.dealType === '월세' ? '보증금' : '52000'} aria-label={priceLabel(form.dealType)} aria-invalid={Boolean(errorFor('price'))} />
                  {form.dealType === '월세' && (
                    <UnitInput unit="만원" id="f-monthlyRent" type="number" min="0" inputMode="numeric" value={form.monthlyRent} onChange={(e) => patch({ monthlyRent: e.target.value })} placeholder="월세" aria-label="월세" />
                  )}
                </div>
                {positive(form.price) && (
                  <p className="text-xs text-muted-foreground">
                    표시 예: {form.dealType === '월세' ? `보증금 ${formatManwon(form.price)} / 월세 ${formatManwon(form.monthlyRent)}` : `${priceLabel(form.dealType)} ${formatManwon(form.price)}`}
                  </p>
                )}
              </Field>
            </div>
          </Section>

          {/* 제6조 건축물 정보 */}
          <Section step="3" title="건축물 정보 (제6조)" description="건축물대장 조회 시 자동 입력되며, 수정 시 대장과 즉시 교차 검증됩니다.">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field id="f-propertyType" label="중개대상물 종류" required error={errorFor('propertyType')} mismatch={mismatches.propertyType} onRestore={() => restore('propertyType')} guide={record ? `대장상 주용도: ${record.mainUse}` : '건축물대장 주용도 기준으로 자동 입력됩니다.'} tooltip="건축법 시행령 별표1에 따른 건축물 용도를 기준으로 표시합니다.">
                <select id="f-propertyType" value={form.propertyType} onChange={(e) => patch({ propertyType: e.target.value as PropertyCategory, locationPrivate: false, floorLevel: '' })} className={inputClass} aria-invalid={Boolean(errorFor('propertyType'))}>
                  <option value="">선택</option>
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>

              <Field id="f-statusNormal" label="건축물 상태" required asGroup error={errorFor('propertyStatus')} guide="미등기건물·위반건축물인 경우 그 사실을 반드시 표시">
                <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-md border border-input bg-card px-3 py-2.5">
                  <Check id="f-statusNormal" checked={form.statusNormal} onChange={(v) => patch({ statusNormal: v, ...(v ? { statusUnregistered: false, statusViolation: false } : {}) })}>
                    해당없음 (일반)
                  </Check>
                  <Check checked={form.statusUnregistered} onChange={(v) => patch({ statusUnregistered: v, ...(v ? { statusNormal: false } : {}) })}>
                    미등기건물
                  </Check>
                  <Check checked={form.statusViolation} onChange={(v) => patch({ statusViolation: v, ...(v ? { statusNormal: false } : {}) })}>
                    위반건축물
                  </Check>
                </div>
              </Field>

              <Field id="f-totalFloors" label="총 층수" required error={errorFor('totalFloors')} mismatch={mismatches.totalFloors} onRestore={() => restore('totalFloors')} guide={record ? `대장상 지상 ${record.totalFloors}층${record.undergroundFloors ? ` / 지하 ${record.undergroundFloors}층` : ''}` : '건축물대장 지상층수 기준 자동 입력'}>
                <UnitInput unit="층" id="f-totalFloors" type="number" min="1" inputMode="numeric" value={form.totalFloors} onChange={(e) => patch({ totalFloors: e.target.value })} placeholder="15" aria-invalid={Boolean(errorFor('totalFloors'))} />
              </Field>

              <Field id="f-approvalDate" label="사용승인일 · 사용검사일 · 준공인가일" required asGroup className="md:col-span-2" error={errorFor('useDate')} mismatch={mismatches.approvalDate} onRestore={() => restore('approvalDate')} guide={record?.approvalDate ? '대장에 기재된 일자가 자동 입력되었으며, 해당하지 않는 항목은 비활성화됩니다.' : '대장에 기재된 일자 중 해당하는 항목을 입력합니다.'} tooltip="건축물대장상 사용승인일, 주택법상 사용검사일 또는 준공인가일 중 해당 일자를 표시합니다.">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {(
                    [
                      ['approvalDate', '사용승인일'],
                      ['inspectionDate', '사용검사일'],
                      ['completionDate', '준공인가일'],
                    ] as const
                  ).map(([key, label]) => {
                    const disabled = !form.datesUnlocked && key !== 'approvalDate'
                    return (
                      <div key={key} className="flex flex-col gap-1">
                        <label htmlFor={`f-${key}`} className={`text-xs font-medium ${disabled ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>
                          {label}
                          {key === 'approvalDate' && record?.approvalDate ? autoBadge(true) : null}
                        </label>
                        <input id={`f-${key}`} type="date" value={form[key]} disabled={disabled} onChange={(e) => patch({ [key]: e.target.value })} className={inputClass} />
                      </div>
                    )
                  })}
                </div>
                {!form.datesUnlocked && (
                  <button type="button" onClick={() => patch({ datesUnlocked: true })} className="self-start text-xs font-medium text-primary underline-offset-2 hover:underline">
                    대장에 사용검사일·준공인가일이 별도 기재된 경우 직접 입력
                  </button>
                )}
              </Field>

              <Field id="f-parkingTotal" label="총 주차대수 (전체건축물 기준)" required error={errorFor('parking')} mismatch={mismatches.parkingTotal} onRestore={() => restore('parkingTotal')} guide={record ? `대장상 옥내·옥외 자주식·기계식 합계${record.households ? ` · 세대(호)수 ${record.households.toLocaleString('ko-KR')}` : ''}` : '건축물대장 주차대수 합계 자동 입력'}>
                <UnitInput unit="대" id="f-parkingTotal" type="number" min="0" inputMode="numeric" value={form.parkingTotal} onChange={(e) => patch({ parkingTotal: e.target.value })} placeholder="0" aria-invalid={Boolean(errorFor('parking'))} />
              </Field>
              <Field id="f-parkingPerHousehold" label="세대당 주차대수" guide={residential && form.propertyType !== '단독주택' ? '총 주차대수 ÷ 세대(호)수 자동 계산' : '공동주택·오피스텔에 한해 표시'}>
                <UnitInput unit="대" id="f-parkingPerHousehold" type="number" min="0" step="0.01" inputMode="decimal" value={form.parkingPerHousehold} onChange={(e) => patch({ parkingPerHousehold: e.target.value })} placeholder="1.2" />
              </Field>
              <Field id="f-parkingActual" label="실제 사용가능한 주차대수 (선택)" guide="대장과 실제 주차 가능 대수가 다를 경우에만 기재" className="md:col-span-2">
                <UnitInput unit="대" id="f-parkingActual" type="number" min="0" inputMode="numeric" value={form.parkingActual} onChange={(e) => patch({ parkingActual: e.target.value })} placeholder="대장과 다를 경우 기재" className="md:max-w-sm" />
              </Field>
            </div>
          </Section>

          {/* 제6조 입주·구조·방향 */}
          <Section step="4" title="입주가능일 · 구조 · 방향 (제6조)">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field id="f-moveIn" label="입주가능일" required asGroup className="md:col-span-2" error={errorFor('moveIn')} guide="구체적 날짜, 즉시입주, 또는 협의 가능 시 월·시기(초순/중순/하순)로 표시">
                <div id="f-moveIn" tabIndex={-1} className="flex flex-col gap-3 focus:outline-none">
                  <div className="flex flex-wrap gap-2">
                    <Radio name="moveIn" value="date" checked={form.moveInMode === 'date'} onChange={() => patch({ moveInMode: 'date' })}>
                      날짜 지정
                    </Radio>
                    <Radio name="moveIn" value="now" checked={form.moveInMode === 'now'} onChange={() => patch({ moveInMode: 'now' })}>
                      즉시입주
                    </Radio>
                    <Radio name="moveIn" value="negotiable" checked={form.moveInMode === 'negotiable'} onChange={() => patch({ moveInMode: 'negotiable' })}>
                      합의에 따라 입주가능일 조정 가능
                    </Radio>
                  </div>
                  {form.moveInMode === 'date' && (
                    <input type="date" aria-label="입주가능일 (YYYY-MM-DD)" value={form.moveInDate} onChange={(e) => patch({ moveInDate: e.target.value })} className={`${inputClass} sm:max-w-xs`} />
                  )}
                  {form.moveInMode === 'negotiable' && (
                    <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
                      <select aria-label="입주 가능 월" value={form.moveInMonth} onChange={(e) => patch({ moveInMonth: e.target.value })} className={inputClass}>
                        <option value="">월 선택</option>
                        {Array.from({ length: 12 }, (_, i) => `${i + 1}월`).map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <select aria-label="입주 가능 시기" value={form.moveInPeriod} onChange={(e) => patch({ moveInPeriod: e.target.value as ListingForm['moveInPeriod'] })} className={inputClass}>
                        <option value="">시기 선택</option>
                        <option value="초순">초순</option>
                        <option value="중순">중순</option>
                        <option value="하순">하순</option>
                      </select>
                    </div>
                  )}
                </div>
              </Field>

              <Field id="f-rooms" label="방 수" required={residential} error={errorFor('rooms')} guide={residential ? '주거용 건축물 필수 표시' : '주거용 건축물에 한해 필수'}>
                <UnitInput unit="개" id="f-rooms" type="number" min="0" inputMode="numeric" value={form.rooms} onChange={(e) => patch({ rooms: e.target.value })} placeholder="3" aria-invalid={Boolean(errorFor('rooms'))} />
              </Field>
              <Field id="f-baths" label="욕실 수" required={residential} error={errorFor('baths')} guide={residential ? '주거용 건축물 필수 표시' : '주거용 건축물에 한해 필수'}>
                <UnitInput unit="개" id="f-baths" type="number" min="0" inputMode="numeric" value={form.baths} onChange={(e) => patch({ baths: e.target.value })} placeholder="2" aria-invalid={Boolean(errorFor('baths'))} />
              </Field>

              <Field
                id="f-direction"
                label="방향 및 기준"
                required
                asGroup
                className="md:col-span-2"
                error={errorFor('direction')}
                tooltip="주택은 거실이나 안방 등 주실(主室)의 방향을, 그 밖의 건축물은 주된 출입구의 방향을 기준으로 표시하며 방향의 기준을 함께 표시합니다."
                guide={
                  !form.propertyType
                    ? '중개대상물 종류에 따라 기준이 정해집니다. (주거용: 거실·안방 / 비주거용: 주된 출입구)'
                    : residential
                      ? '주거용 건축물: 거실 또는 안방 기준으로 표시 (주된 출입구 기준 불가)'
                      : '비주거용 건축물: 주된 출입구 기준으로 표시 (거실·안방 기준 불가)'
                }
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <select id="f-direction" aria-label="방향" value={form.direction} onChange={(e) => patch({ direction: e.target.value })} className={`${inputClass} sm:max-w-40`} aria-invalid={Boolean(errorFor('direction'))}>
                    <option value="">방향 선택</option>
                    {DIRECTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}향
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="방향 기준">
                    {DIRECTION_BASES.map((b) => (
                      <Radio key={b} name="directionBase" value={b} checked={form.directionBase === b} disabled={!bases.includes(b)} onChange={(v) => patch({ directionBase: v as ListingForm['directionBase'] })}>
                        {b} 기준
                      </Radio>
                    ))}
                  </div>
                </div>
              </Field>
            </div>
          </Section>

          {/* 제6조 관리비 */}
          <Section step="5" title="관리비 (제6조)" description="주택의 관리비는 부과 방식에 따라 세부 내역 또는 월 평균액을 표시합니다.">
            <div id="f-fee" tabIndex={-1} className="flex flex-col gap-4 focus:outline-none">
              {form.propertyType && !residential && (
                <Check checked={form.feeExempt} onChange={(v) => patch({ feeExempt: v, ...(v ? { feeMode: '' } : {}) })}>
                  주택 외 건축물 (관리비 필수기재 대상 아님)
                </Check>
              )}
              {errorFor('fee') && <p className="text-xs font-medium text-destructive">{errorFor('fee')}</p>}

              {!form.feeExempt && (
                <>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="관리비 표시 방식">
                    <Radio name="feeMode" value="fixed" checked={form.feeMode === 'fixed'} onChange={() => patch({ feeMode: 'fixed' })}>
                      <span>
                        <span className="block font-medium">A. 월 10만원 이상 정액 부과</span>
                        <span className="block text-xs text-muted-foreground">8개 세부 항목별 금액 표시</span>
                      </span>
                    </Radio>
                    <Radio name="feeMode" value="average" checked={form.feeMode === 'average'} onChange={() => patch({ feeMode: 'average' })}>
                      <span>
                        <span className="block font-medium">B. 그 외 (월 평균 관리비 표시)</span>
                        <span className="block text-xs text-muted-foreground">직전 연도 월 평균액 등</span>
                      </span>
                    </Radio>
                  </div>

                  {form.feeMode === 'fixed' && (
                    <div className="flex flex-col gap-4 rounded-lg border border-input bg-muted/40 p-4">
                      <Field id="f-feeTotal" label="월 정액 관리비 총액" required guide="정액 관리비가 월 10만원 이상인 경우 세부 항목을 구분 표시">
                        <UnitInput unit="원" id="f-feeTotal" type="number" min="0" inputMode="numeric" value={form.feeTotal} onChange={(e) => patch({ feeTotal: e.target.value })} placeholder="150000" className="sm:max-w-xs" />
                      </Field>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {FEE_ITEMS.map(([key, label]) => (
                          <div key={key} className="flex flex-col gap-1">
                            <label htmlFor={`fee-${key}`} className={`text-xs font-medium ${form.feeDetailUnavailable ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>
                              {label}
                            </label>
                            <UnitInput unit="원" id={`fee-${key}`} type="number" min="0" inputMode="numeric" value={form.feeItems[key]} disabled={form.feeDetailUnavailable} onChange={(e) => patch({ feeItems: { ...form.feeItems, [key]: e.target.value } })} placeholder="0" />
                          </div>
                        ))}
                      </div>
                      {!form.feeDetailUnavailable && positive(form.feeTotal) && FEE_ITEMS.every(([k]) => filled(form.feeItems[k])) && (
                        (() => {
                          const sum = FEE_ITEMS.reduce((s, [k]) => s + Number(form.feeItems[k] || 0), 0)
                          return sum !== Number(form.feeTotal) ? (
                            <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                              <AlertTriangle className="size-3.5" aria-hidden="true" />
                              세부 항목 합계({won(String(sum))})가 총액({won(form.feeTotal)})과 다릅니다.
                            </p>
                          ) : null
                        })()
                      )}
                      <Check checked={form.feeDetailUnavailable} onChange={(v) => patch({ feeDetailUnavailable: v })}>
                        중개의뢰인 세부내역 미제시로 인한 확인 불가
                      </Check>
                    </div>
                  )}

                  {form.feeMode === 'average' && (
                    <div className="grid grid-cols-1 gap-4 rounded-lg border border-input bg-muted/40 p-4 md:grid-cols-2">
                      <Field id="f-feeAverage" label="월 평균 관리비" required guide="원 단위로 기재">
                        <UnitInput unit="원" id="f-feeAverage" type="number" min="0" inputMode="numeric" value={form.feeAverage} onChange={(e) => patch({ feeAverage: e.target.value })} placeholder="85000" />
                      </Field>
                      <Field id="f-feeIncluded" label="포함 항목 (선택)" guide="예: 일반관리비, 수도료 포함">
                        <input id="f-feeIncluded" value={form.feeIncluded} onChange={(e) => patch({ feeIncluded: e.target.value })} placeholder="일반관리비, 수도료" className={inputClass} />
                      </Field>
                    </div>
                  )}
                </>
              )}
            </div>
          </Section>

          <div className="sticky bottom-0 z-20 -mx-4 border-t bg-background/95 px-4 py-4 backdrop-blur md:-mx-6 md:px-6">
            {notice && (
              <p role="alert" className="mb-3 flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                {notice}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                명시사항 {doneCount}/{checklist.length} 완료 ·{' '}
                {record ? (mismatchCount > 0 ? `공적장부 불일치 ${mismatchCount}건` : `${ledgerHint} · 불일치 없음`) : '공적장부 미조회'}
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={handleReset} className={`${outlineButton} h-11 flex-1 sm:flex-none`}>
                  <RotateCcw className="size-4" aria-hidden="true" />
                  초기화
                </button>
                <button type="button" onClick={handleVerify} className={`${primaryButton} h-11 flex-1 px-5 sm:flex-none`}>
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  광고 명시사항 검증하기
                </button>
              </div>
            </div>
          </div>

          {template && <AdTemplate text={template} sectionRef={templateRef} />}
        </main>

        <aside aria-label="명시사항 체크리스트" className="hidden lg:block">
          <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl border bg-card p-4 shadow-xs">
            <ChecklistPanel items={checklist} onJump={jump} />
          </div>
        </aside>
      </div>

      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        aria-label={`명시사항 체크리스트 열기 (${doneCount}/${checklist.length} 완료)`}
        className="fixed right-4 bottom-28 z-30 flex items-center gap-1.5 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-lg lg:hidden"
      >
        <ClipboardList className="size-4" aria-hidden="true" />
        {doneCount}/{checklist.length}
      </button>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex justify-end bg-foreground/40 lg:hidden" onClick={() => setDrawerOpen(false)} onKeyDown={(e) => e.key === 'Escape' && setDrawerOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="명시사항 체크리스트" className="h-full w-80 max-w-[85vw] overflow-y-auto bg-card p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex justify-end">
              <button type="button" autoFocus onClick={() => setDrawerOpen(false)} aria-label="체크리스트 닫기" className="rounded-md p-1 text-muted-foreground hover:bg-muted">
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <ChecklistPanel items={checklist} onJump={jump} />
          </div>
        </div>
      )}

      <footer className="border-t bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6 text-xs leading-relaxed text-muted-foreground md:px-6">
          본 자가진단 결과는 사전참고용이며 법적 적합성을 보증하지 않습니다. 최종 책임은 광고를 게재하는 개업공인중개사에게 있습니다. ·
          건축물대장 데이터: 국토교통부 건축HUB 건축물대장정보 서비스
        </div>
      </footer>

      {modalOpen && <DisclaimerModal onClose={() => setModalOpen(false)} onConfirm={handleConfirm} />}
    </div>
    {!termsAccepted && <TermsGateModal onAccept={() => setTermsAccepted(true)} />}
    </>
  )
}
