function escapeCsvCell(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

const sampleRows = [
  {
    name: "세라마이드 보습 크림 50ml",
    description:
      "사용부위 페이스용, 사용시간 낮/밤, 피부타입 모든피부용, 종류 세럼, 주요특징 촉촉함과 흡수력"
  },
  {
    name: "블루투스 노이즈캔슬링 이어폰",
    description:
      "무선 연결, 충전 케이스 포함, 디지털 오디오 기기, 통화 기능 지원"
  },
  {
    name: "프로틴 시리얼 바",
    description:
      "단백질 보충용 간식, 운동 후 섭취, 곡물 베이스, 휴대가 쉬운 식품"
  },
  {
    name: "고양이 사료 연어맛",
    description:
      "반려묘용 건식 사료, 기호성 강화, 영양 밸런스 설계, 소화가 편한 포뮬러"
  },
  {
    name: "러닝 경량 바람막이",
    description:
      "러닝과 야외활동용, 발수 기능, 가벼운 착용감, 스포츠 웨어"
  },
  {
    name: "유아 PPSU 젖병 세트",
    description:
      "아기 수유용, PPSU 소재, 내열성 우수, 젖꼭지 포함"
  },
  {
    name: "리빙 수납 바스켓",
    description:
      "거실과 욕실 정리용, 손잡이 포함, 플라스틱 소재, 생활 수납용품"
  },
  {
    name: "데일리 코튼 셔츠",
    description:
      "남녀공용 패션 아이템, 부드러운 촉감, 출근룩과 데일리룩에 적합"
  },
  {
    name: "공기청정기 필터 포함 모델",
    description:
      "미세먼지 제거, 자동 풍량 조절, 실내 공기 관리, 가전 제품"
  },
  {
    name: "비타민C 젤리 스틱",
    description:
      "건강 간식, 상큼한 맛, 휴대용 포장, 1일 1포 섭취 형태"
  }
];

export const sampleBatchCsv = [
  "상품명,상품설명",
  ...sampleRows.map((row) => `${escapeCsvCell(row.name)},${escapeCsvCell(row.description)}`)
].join("\r\n");

export function downloadSampleBatchCsv() {
  const blob = new Blob([`\uFEFF${sampleBatchCsv}`], {
    type: "text/csv;charset=utf-8;"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "smart-labeling-sample-batch.csv";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
