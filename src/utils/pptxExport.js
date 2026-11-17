/**
 * Pure-ES OpenXML (.pptx) generator for EG Education Bloom Lesson Studio.
 * Builds a standards-compliant ECMA-376 PowerPoint archive (Store ZIP + CRC-32)
 * with zero external runtime dependencies in both Browser and Node.js.
 */

const textEncoder = new TextEncoder();

// Precompute IEEE 802.3 CRC-32 lookup table
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);
  const dosTime = ((hours & 0x1f) << 11) | ((minutes & 0x3f) << 5) | (seconds & 0x1f);
  const dosDate = (((year - 1980) & 0x7f) << 9) | ((month & 0x0f) << 5) | (day & 0x1f);
  return { dosTime, dosDate };
}

/**
 * Create a PKZIP (Store compression = 0) archive in memory.
 * @param {Array<{ name: string, data: string | Uint8Array }>} entries
 * @returns {Uint8Array}
 */
export function createZipBytes(entries) {
  const { dosTime, dosDate } = getDosDateTime();
  const prepared = entries.map((entry) => {
    const nameBytes = textEncoder.encode(entry.name);
    const contentBytes =
      entry.data instanceof Uint8Array ? entry.data : textEncoder.encode(String(entry.data));
    return {
      nameBytes,
      contentBytes,
      crc: crc32(contentBytes),
    };
  });

  let localTotalSize = 0;
  let centralTotalSize = 0;
  for (const item of prepared) {
    localTotalSize += 30 + item.nameBytes.length + item.contentBytes.length;
    centralTotalSize += 46 + item.nameBytes.length;
  }
  const eocdSize = 22;
  const output = new Uint8Array(localTotalSize + centralTotalSize + eocdSize);
  const view = new DataView(output.buffer);

  let offset = 0;
  const localOffsets = [];

  for (const item of prepared) {
    localOffsets.push(offset);
    // Local file header signature
    view.setUint32(offset, 0x04034b50, true);
    // Version needed to extract (2.0)
    view.setUint16(offset + 4, 20, true);
    // General purpose bit flag (bit 11 = UTF-8 filename)
    view.setUint16(offset + 6, 0x0800, true);
    // Compression method (0 = Store)
    view.setUint16(offset + 8, 0, true);
    view.setUint16(offset + 10, dosTime, true);
    view.setUint16(offset + 12, dosDate, true);
    view.setUint32(offset + 14, item.crc, true);
    view.setUint32(offset + 18, item.contentBytes.length, true);
    view.setUint32(offset + 22, item.contentBytes.length, true);
    view.setUint16(offset + 26, item.nameBytes.length, true);
    view.setUint16(offset + 28, 0, true);
    offset += 30;

    output.set(item.nameBytes, offset);
    offset += item.nameBytes.length;

    output.set(item.contentBytes, offset);
    offset += item.contentBytes.length;
  }

  const centralDirOffset = offset;

  for (let i = 0; i < prepared.length; i++) {
    const item = prepared[i];
    // Central directory file header signature
    view.setUint32(offset, 0x02014b50, true);
    // Version made by (2.0, UNIX/neutral)
    view.setUint16(offset + 4, 20, true);
    // Version needed to extract
    view.setUint16(offset + 6, 20, true);
    // UTF-8 filename flag
    view.setUint16(offset + 8, 0x0800, true);
    // Compression method (0 = Store)
    view.setUint16(offset + 10, 0, true);
    view.setUint16(offset + 12, dosTime, true);
    view.setUint16(offset + 14, dosDate, true);
    view.setUint32(offset + 16, item.crc, true);
    view.setUint32(offset + 20, item.contentBytes.length, true);
    view.setUint32(offset + 24, item.contentBytes.length, true);
    view.setUint16(offset + 28, item.nameBytes.length, true);
    view.setUint16(offset + 30, 0, true);
    view.setUint16(offset + 32, 0, true);
    view.setUint16(offset + 34, 0, true);
    view.setUint16(offset + 36, 0, true);
    view.setUint32(offset + 38, 0, true);
    view.setUint32(offset + 42, localOffsets[i], true);
    offset += 46;

    output.set(item.nameBytes, offset);
    offset += item.nameBytes.length;
  }

  const centralDirSize = offset - centralDirOffset;

  // End of central directory record
  view.setUint32(offset, 0x06054b50, true);
  view.setUint16(offset + 4, 0, true);
  view.setUint16(offset + 6, 0, true);
  view.setUint16(offset + 8, prepared.length, true);
  view.setUint16(offset + 10, prepared.length, true);
  view.setUint32(offset + 12, centralDirSize, true);
  view.setUint32(offset + 16, centralDirOffset, true);
  view.setUint16(offset + 20, 0, true);

  return output;
}

/**
 * Strip illegal XML control characters and escape XML entities.
 */
function escapeXml(value) {
  return String(value ?? '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildTextParagraphXml({
  text,
  fontSizePt = 18,
  colorHex = '1E293B',
  bold = false,
  italic = false,
  align = 'l',
  spaceAfterPt = 6,
  bulletChar = '',
  indentEmu = 0,
}) {
  const sz = Math.round(fontSizePt * 100);
  const spcAft = Math.round(spaceAfterPt * 100);
  const buXml = bulletChar
    ? `<a:buFont typeface="Segoe UI"/><a:buChar char="${escapeXml(bulletChar)}"/>`
    : '<a:buNone/>';
  const marL = indentEmu > 0 ? ` marL="${indentEmu}" indent="-${Math.min(indentEmu, 228600)}"` : '';
  const displayText = text === '' ? ' ' : text;

  return `<a:p><a:pPr algn="${align}"${marL}><a:spcAft><a:spcPts val="${spcAft}"/></a:spcAft>${buXml}</a:pPr><a:r><a:rPr lang="vi-VN" sz="${sz}"${bold ? ' b="1"' : ''}${italic ? ' i="1"' : ''} dirty="0"><a:solidFill><a:srgbClr val="${colorHex}"/></a:solidFill><a:latin typeface="Segoe UI"/><a:cs typeface="Segoe UI"/></a:rPr><a:t>${escapeXml(displayText)}</a:t></a:r><a:endParaRPr lang="vi-VN" sz="${sz}"/></a:p>`;
}

function buildRectShapeXml({
  id,
  name,
  x,
  y,
  cx,
  cy,
  fillHex = null,
  lineHex = null,
  lineWidthEmu = 12700,
  prst = 'rect',
  paragraphs = [],
  anchor = 't',
  marginLR = 127000,
  marginTB = 76200,
}) {
  const fillXml = fillHex
    ? `<a:solidFill><a:srgbClr val="${fillHex}"/></a:solidFill>`
    : '<a:noFill/>';
  const lineXml = lineHex
    ? `<a:ln w="${lineWidthEmu}"><a:solidFill><a:srgbClr val="${lineHex}"/></a:solidFill></a:ln>`
    : '<a:ln><a:noFill/></a:ln>';

  const txBodyXml =
    paragraphs.length > 0
      ? `<p:txBody><a:bodyPr wrap="square" lIns="${marginLR}" tIns="${marginTB}" rIns="${marginLR}" bIns="${marginTB}" anchor="${anchor}"><a:normAutofit/></a:bodyPr><a:lstStyle/>${paragraphs.join('')}</p:txBody>`
      : '<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="vi-VN"/></a:p></p:txBody>';

  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${escapeXml(name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="${prst}"><a:avLst/></a:prstGeom>${fillXml}${lineXml}</p:spPr>${txBodyXml}</p:sp>`;
}

function wrapSlideXml(bgHex, shapesXml) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="${bgHex}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      ${shapesXml.join('\n      ')}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
}

/**
 * Parse a generated Bloom outline string such as:
 * "Slide 1 [Phần 1 - Khởi động]: Mục tiêu khóa học – Hiểu quy trình nhập học và ..."
 */
function parseSlideOutline(rawText, index) {
  const clean = String(rawText ?? '').trim();
  let sectionLabel = 'Nội dung bài giảng';
  let body = clean;

  const prefixMatch = clean.match(/^Slide\s*\d*\s*(?:\[(.*?)\])?\s*:\s*(.*)$/i);
  if (prefixMatch) {
    if (prefixMatch[1]?.trim()) {
      sectionLabel = prefixMatch[1].trim();
    }
    body = (prefixMatch[2] || clean).trim();
  }

  let heading = `Slide ${index + 1}`;
  let detailText = body;

  const dashSplit = body.match(/^([^–—:\n]{3,90}?)\s*(?:–|—|:|-)\s+(.+)$/);
  if (dashSplit) {
    heading = dashSplit[1].trim();
    detailText = dashSplit[2].trim();
  } else if (body.length <= 80) {
    heading = body || heading;
    detailText = '';
  } else {
    heading = `Nội dung trọng tâm — Slide ${index + 1}`;
    detailText = body;
  }

  const rawPoints = detailText
    ? detailText
        .split(/\n+|;\s*/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [heading];

  return {
    slideNumber: index + 1,
    sectionLabel,
    heading,
    points: rawPoints.length > 0 ? rawPoints : [clean],
  };
}

function getSectionAccentHex(sectionLabel) {
  const lower = sectionLabel.toLowerCase();
  if (lower.includes('khởi động') || lower.includes('phần 1')) return '7C3AED';
  if (lower.includes('vận dụng') || lower.includes('đánh giá') || lower.includes('phần 3')) {
    return '059669';
  }
  return '4F46E5';
}

function buildCoverSlideXml({ title, bloomLevel, sourceFileName, slideCount, quizCount }) {
  const shapes = [
    // Left vertical violet/emerald bar
    buildRectShapeXml({
      id: 2,
      name: 'AccentStripe',
      x: 0,
      y: 0,
      cx: 260000,
      cy: 6858000,
      fillHex: '7C3AED',
    }),
    // Top badge pill
    buildRectShapeXml({
      id: 3,
      name: 'HeaderBadge',
      x: 820000,
      y: 760000,
      cx: 5400000,
      cy: 520000,
      fillHex: '312E81',
      lineHex: '6366F1',
      prst: 'roundRect',
      anchor: 'ctr',
      paragraphs: [
        buildTextParagraphXml({
          text: 'EG EDUCATION • AI BLOOM LESSON STUDIO',
          fontSizePt: 13,
          colorHex: 'C4B5FD',
          bold: true,
          spaceAfterPt: 0,
        }),
      ],
    }),
    // Main presentation title
    buildRectShapeXml({
      id: 4,
      name: 'MainTitle',
      x: 820000,
      y: 1620000,
      cx: 10550000,
      cy: 2100000,
      anchor: 't',
      paragraphs: [
        buildTextParagraphXml({
          text: title || 'Giáo án Trình chiếu Chuẩn Bloom',
          fontSizePt: 34,
          colorHex: 'FFFFFF',
          bold: true,
          spaceAfterPt: 14,
        }),
        buildTextParagraphXml({
          text: `Mục tiêu nhận thức: ${bloomLevel || 'Vận dụng & Phân tích (Bloom Taxonomy)'}`,
          fontSizePt: 18,
          colorHex: 'A5B4FC',
          bold: false,
          spaceAfterPt: 0,
        }),
      ],
    }),
    // Summary metadata card
    buildRectShapeXml({
      id: 5,
      name: 'MetaCard',
      x: 820000,
      y: 4180000,
      cx: 10550000,
      cy: 1580000,
      fillHex: '1E1B4B',
      lineHex: '4338CA',
      prst: 'roundRect',
      anchor: 'ctr',
      marginLR: 200000,
      paragraphs: [
        buildTextParagraphXml({
          text: `Nguồn học liệu: ${sourceFileName || 'Giáo trình & Tài liệu học phần'}`,
          fontSizePt: 15,
          colorHex: 'E2E8F0',
          bold: true,
          spaceAfterPt: 8,
        }),
        buildTextParagraphXml({
          text: `Quy mô bài giảng: ${slideCount} slide nội dung trình chiếu + ${quizCount} câu hỏi đánh giá chuẩn Bloom`,
          fontSizePt: 14,
          colorHex: 'CBD5E1',
          spaceAfterPt: 6,
        }),
        buildTextParagraphXml({
          text: 'Giảng viên: ThS. Phạm Văn Thuận • Lớp CNTT K26 • Trường Đại học Tây Nguyên',
          fontSizePt: 13,
          colorHex: '94A3B8',
          spaceAfterPt: 0,
        }),
      ],
    }),
  ];

  return wrapSlideXml('0F172A', shapes);
}

function buildContentSlideXml({
  parsed,
  lessonTitle,
  pageNumber,
  totalPages,
}) {
  const accentHex = getSectionAccentHex(parsed.sectionLabel);
  const bulletParagraphs = parsed.points.map((pt) =>
    buildTextParagraphXml({
      text: pt,
      fontSizePt: parsed.points.length > 4 ? 17 : 20,
      colorHex: '1E293B',
      bold: false,
      spaceAfterPt: 14,
      bulletChar: '•',
      indentEmu: 285750,
    }),
  );

  const shapes = [
    // Top color bar
    buildRectShapeXml({
      id: 2,
      name: 'TopBar',
      x: 0,
      y: 0,
      cx: 12192000,
      cy: 110000,
      fillHex: accentHex,
    }),
    // Section badge pill
    buildRectShapeXml({
      id: 3,
      name: 'SectionBadge',
      x: 640000,
      y: 340000,
      cx: 4100000,
      cy: 420000,
      fillHex: accentHex,
      prst: 'roundRect',
      anchor: 'ctr',
      paragraphs: [
        buildTextParagraphXml({
          text: parsed.sectionLabel.toUpperCase(),
          fontSizePt: 11,
          colorHex: 'FFFFFF',
          bold: true,
          spaceAfterPt: 0,
        }),
      ],
    }),
    // Slide badge on top right
    buildRectShapeXml({
      id: 4,
      name: 'SlideCounter',
      x: 9200000,
      y: 340000,
      cx: 2350000,
      cy: 420000,
      fillHex: 'EEF2FF',
      lineHex: 'C7D2FE',
      prst: 'roundRect',
      anchor: 'ctr',
      paragraphs: [
        buildTextParagraphXml({
          text: `SLIDE ${String(parsed.slideNumber).padStart(2, '0')}`,
          fontSizePt: 11,
          colorHex: '4338CA',
          bold: true,
          align: 'ctr',
          spaceAfterPt: 0,
        }),
      ],
    }),
    // Heading
    buildRectShapeXml({
      id: 5,
      name: 'SlideTitle',
      x: 640000,
      y: 860000,
      cx: 10912000,
      cy: 860000,
      anchor: 'ctr',
      marginLR: 40000,
      paragraphs: [
        buildTextParagraphXml({
          text: parsed.heading,
          fontSizePt: 25,
          colorHex: '0F172A',
          bold: true,
          spaceAfterPt: 0,
        }),
      ],
    }),
    // Main white content card
    buildRectShapeXml({
      id: 6,
      name: 'BodyCard',
      x: 640000,
      y: 1840000,
      cx: 10912000,
      cy: 4220000,
      fillHex: 'FFFFFF',
      lineHex: 'E2E8F0',
      prst: 'roundRect',
      anchor: 't',
      marginLR: 260000,
      marginTB: 220000,
      paragraphs: bulletParagraphs,
    }),
    // Footer left
    buildRectShapeXml({
      id: 7,
      name: 'FooterLeft',
      x: 640000,
      y: 6260000,
      cx: 8400000,
      cy: 380000,
      anchor: 'ctr',
      marginLR: 0,
      paragraphs: [
        buildTextParagraphXml({
          text: `${lessonTitle || 'Giáo án chuẩn Bloom'} • EG Education Platform`,
          fontSizePt: 10,
          colorHex: '64748B',
          spaceAfterPt: 0,
        }),
      ],
    }),
    // Footer right
    buildRectShapeXml({
      id: 8,
      name: 'FooterRight',
      x: 9200000,
      y: 6260000,
      cx: 2350000,
      cy: 380000,
      anchor: 'ctr',
      marginLR: 0,
      paragraphs: [
        buildTextParagraphXml({
          text: `Trang ${pageNumber} / ${totalPages}`,
          fontSizePt: 10,
          colorHex: '64748B',
          bold: true,
          align: 'r',
          spaceAfterPt: 0,
        }),
      ],
    }),
  ];

  return wrapSlideXml('F8FAFC', shapes);
}

function buildQuizSlideXml({
  quiz,
  quizIndex,
  totalQuizzes,
  lessonTitle,
  pageNumber,
  totalPages,
}) {
  const questionText = quiz.q || quiz.question || `Câu hỏi ôn tập #${quizIndex + 1}`;
  const options = Array.isArray(quiz.options) ? quiz.options : [];
  const correctAns = quiz.ans || quiz.correctAnswer || '';
  const explanation = quiz.explain || quiz.explanation || '';

  const optionParagraphs = [
    buildTextParagraphXml({
      text: questionText,
      fontSizePt: 20,
      colorHex: '0F172A',
      bold: true,
      spaceAfterPt: 14,
    }),
    ...options.map((opt) =>
      buildTextParagraphXml({
        text: opt,
        fontSizePt: 16,
        colorHex: '334155',
        bold: false,
        spaceAfterPt: 8,
        bulletChar: '▪',
        indentEmu: 228600,
      }),
    ),
  ];

  const shapes = [
    buildRectShapeXml({
      id: 2,
      name: 'QuizTopBar',
      x: 0,
      y: 0,
      cx: 12192000,
      cy: 110000,
      fillHex: '059669',
    }),
    buildRectShapeXml({
      id: 3,
      name: 'QuizBadge',
      x: 640000,
      y: 340000,
      cx: 5600000,
      cy: 420000,
      fillHex: '059669',
      prst: 'roundRect',
      anchor: 'ctr',
      paragraphs: [
        buildTextParagraphXml({
          text: `CÂU HỎI ĐÁNH GIÁ CHUẨN BLOOM (${quizIndex + 1}/${totalQuizzes})`,
          fontSizePt: 11,
          colorHex: 'FFFFFF',
          bold: true,
          spaceAfterPt: 0,
        }),
      ],
    }),
    buildRectShapeXml({
      id: 4,
      name: 'QuizQuestionCard',
      x: 640000,
      y: 920000,
      cx: 10912000,
      cy: 3820000,
      fillHex: 'FFFFFF',
      lineHex: 'E2E8F0',
      prst: 'roundRect',
      anchor: 't',
      marginLR: 240000,
      marginTB: 180000,
      paragraphs: optionParagraphs,
    }),
    buildRectShapeXml({
      id: 5,
      name: 'QuizAnswerBox',
      x: 640000,
      y: 4920000,
      cx: 10912000,
      cy: 1160000,
      fillHex: 'ECFDF5',
      lineHex: '6EE7B7',
      prst: 'roundRect',
      anchor: 'ctr',
      marginLR: 220000,
      paragraphs: [
        buildTextParagraphXml({
          text: `Đáp án đúng: ${correctAns || 'Xem phần giải thích'}`,
          fontSizePt: 15,
          colorHex: '065F46',
          bold: true,
          spaceAfterPt: 4,
        }),
        ...(explanation
          ? [
              buildTextParagraphXml({
                text: `Giải thích: ${explanation}`,
                fontSizePt: 13,
                colorHex: '047857',
                spaceAfterPt: 0,
              }),
            ]
          : []),
      ],
    }),
    buildRectShapeXml({
      id: 6,
      name: 'FooterLeft',
      x: 640000,
      y: 6260000,
      cx: 8400000,
      cy: 380000,
      anchor: 'ctr',
      marginLR: 0,
      paragraphs: [
        buildTextParagraphXml({
          text: `${lessonTitle || 'Giáo án chuẩn Bloom'} • Kiểm tra đánh giá`,
          fontSizePt: 10,
          colorHex: '64748B',
          spaceAfterPt: 0,
        }),
      ],
    }),
    buildRectShapeXml({
      id: 7,
      name: 'FooterRight',
      x: 9200000,
      y: 6260000,
      cx: 2350000,
      cy: 380000,
      anchor: 'ctr',
      marginLR: 0,
      paragraphs: [
        buildTextParagraphXml({
          text: `Trang ${pageNumber} / ${totalPages}`,
          fontSizePt: 10,
          colorHex: '64748B',
          bold: true,
          align: 'r',
          spaceAfterPt: 0,
        }),
      ],
    }),
  ];

  return wrapSlideXml('F8FAFC', shapes);
}

function buildContentTypesXml(slideCount) {
  const slideOverrides = Array.from({ length: slideCount }, (_, i) =>
    `  <Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`,
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/>
  <Override PartName="/ppt/viewProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml"/>
  <Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
${slideOverrides}
</Types>`;
}

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/package/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

function buildCorePropsXml(title) {
  const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(title || 'Giáo án Trình chiếu Chuẩn Bloom')}</dc:title>
  <dc:creator>ThS. Phạm Văn Thuận</dc:creator>
  <cp:lastModifiedBy>EG Education Bloom Studio</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:modified>
</cp:coreProperties>`;
}

function buildAppPropsXml(slideCount) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>EG Education Bloom Studio</Application>
  <PresentationFormat>Widescreen</PresentationFormat>
  <Slides>${slideCount}</Slides>
  <Notes>0</Notes>
  <HiddenSlides>0</HiddenSlides>
  <MMClips>0</MMClips>
  <ScaleCrop>false</ScaleCrop>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>`;
}

function buildPresentationRelsXml(slideCount) {
  const slideRels = Array.from({ length: slideCount }, (_, i) =>
    `  <Relationship Id="rId${6 + i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`,
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps" Target="presProps.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps" Target="viewProps.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles" Target="tableStyles.xml"/>
${slideRels}
</Relationships>`;
}

function buildPresentationXml(slideCount) {
  const sldIds = Array.from({ length: slideCount }, (_, i) =>
    `    <p:sldId id="${256 + i}" r:id="rId${6 + i}"/>`,
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" saveSubsetFonts="1">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
${sldIds}
  </p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000"/>
  <p:notesSz cx="6858000" cy="9144000"/>
  <p:defaultTextStyle>
    <a:defPPr><a:defRPr lang="vi-VN"/></a:defPPr>
  </p:defaultTextStyle>
</p:presentation>`;
}

const SLIDE_MASTER_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`;

const SLIDE_MASTER_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483649" r:id="rId1"/>
  </p:sldLayoutIdLst>
  <p:txStyles>
    <p:titleStyle><a:lvl1pPr algn="l"><a:defRPr sz="3600" b="1"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill></a:defRPr></a:lvl1pPr></p:titleStyle>
    <p:bodyStyle><a:lvl1pPr algn="l"><a:defRPr sz="2000"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill></a:defRPr></a:lvl1pPr></p:bodyStyle>
    <p:otherStyle><a:defPPr><a:defRPr lang="vi-VN"/></a:defPPr></p:otherStyle>
  </p:txStyles>
</p:sldMaster>`;

const SLIDE_LAYOUT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;

const SLIDE_LAYOUT_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
  <p:cSld name="Blank">
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`;

const SLIDE_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;

const THEME_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="EG Education Theme">
  <a:themeElements>
    <a:clrScheme name="EG Education">
      <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="1E293B"/></a:dk2>
      <a:lt2><a:srgbClr val="F8FAFC"/></a:lt2>
      <a:accent1><a:srgbClr val="4F46E5"/></a:accent1>
      <a:accent2><a:srgbClr val="7C3AED"/></a:accent2>
      <a:accent3><a:srgbClr val="059669"/></a:accent3>
      <a:accent4><a:srgbClr val="0284C7"/></a:accent4>
      <a:accent5><a:srgbClr val="D97706"/></a:accent5>
      <a:accent6><a:srgbClr val="DC2626"/></a:accent6>
      <a:hlink><a:srgbClr val="4F46E5"/></a:hlink>
      <a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="EG Fonts">
      <a:majorFont><a:latin typeface="Segoe UI"/><a:ea typeface=""/><a:cs typeface="Segoe UI"/></a:majorFont>
      <a:minorFont><a:latin typeface="Segoe UI"/><a:ea typeface=""/><a:cs typeface="Segoe UI"/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="EG Formats">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="25400" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="38100" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
      </a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`;

const PRES_PROPS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presProps xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>`;

const VIEW_PROPS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:viewProps xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:normalViewPr><p:restoredLeft sz="15620"/><p:restoredTop sz="94660"/></p:normalViewPr>
  <p:slideViewPr><p:cSldViewPr><p:cViewPr varScale="1"><p:scale><a:sx n="100" d="100"/><a:sy n="100" d="100"/></p:scale><p:origin x="0" y="0"/></p:cViewPr></p:cSldViewPr></p:slideViewPr>
</p:viewProps>`;

const TABLE_STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:tblStyleLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>`;

/**
 * Build raw `.pptx` file bytes from AI Bloom lesson result data.
 * @param {{ title?: string, bloomLevel?: string, slideCount?: number, sourceFileName?: string, slides?: string[], quizzes?: Array<object> }} lessonData
 * @returns {Uint8Array}
 */
export function buildBloomLessonPptxBytes(lessonData) {
  const safeLesson = lessonData || {};
  const rawSlides = Array.isArray(safeLesson.slides) ? safeLesson.slides : [];
  const rawQuizzes = Array.isArray(safeLesson.quizzes) ? safeLesson.quizzes : [];

  const parsedContentSlides = rawSlides.map((txt, idx) => parseSlideOutline(txt, idx));
  const totalPages = 1 + parsedContentSlides.length + rawQuizzes.length;

  const slideXmlList = [];

  // 1. Cover slide
  slideXmlList.push(
    buildCoverSlideXml({
      title: safeLesson.title,
      bloomLevel: safeLesson.bloomLevel,
      sourceFileName: safeLesson.sourceFileName,
      slideCount: parsedContentSlides.length || safeLesson.slideCount || 0,
      quizCount: rawQuizzes.length,
    }),
  );

  // 2. Content slides
  parsedContentSlides.forEach((parsed, idx) => {
    slideXmlList.push(
      buildContentSlideXml({
        parsed,
        lessonTitle: safeLesson.title,
        pageNumber: idx + 2,
        totalPages,
      }),
    );
  });

  // 3. Bloom Quiz slides
  rawQuizzes.forEach((quiz, idx) => {
    slideXmlList.push(
      buildQuizSlideXml({
        quiz,
        quizIndex: idx,
        totalQuizzes: rawQuizzes.length,
        lessonTitle: safeLesson.title,
        pageNumber: 2 + parsedContentSlides.length + idx,
        totalPages,
      }),
    );
  });

  const slideCount = slideXmlList.length;

  const files = [
    { name: '[Content_Types].xml', data: buildContentTypesXml(slideCount) },
    { name: '_rels/.rels', data: ROOT_RELS_XML },
    { name: 'docProps/core.xml', data: buildCorePropsXml(safeLesson.title) },
    { name: 'docProps/app.xml', data: buildAppPropsXml(slideCount) },
    { name: 'ppt/presentation.xml', data: buildPresentationXml(slideCount) },
    { name: 'ppt/_rels/presentation.xml.rels', data: buildPresentationRelsXml(slideCount) },
    { name: 'ppt/presProps.xml', data: PRES_PROPS_XML },
    { name: 'ppt/viewProps.xml', data: VIEW_PROPS_XML },
    { name: 'ppt/tableStyles.xml', data: TABLE_STYLES_XML },
    { name: 'ppt/theme/theme1.xml', data: THEME_XML },
    { name: 'ppt/slideMasters/slideMaster1.xml', data: SLIDE_MASTER_XML },
    { name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: SLIDE_MASTER_RELS_XML },
    { name: 'ppt/slideLayouts/slideLayout1.xml', data: SLIDE_LAYOUT_XML },
    { name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: SLIDE_LAYOUT_RELS_XML },
  ];

  slideXmlList.forEach((xml, idx) => {
    const slideNum = idx + 1;
    files.push({ name: `ppt/slides/slide${slideNum}.xml`, data: xml });
    files.push({ name: `ppt/slides/_rels/slide${slideNum}.xml.rels`, data: SLIDE_RELS_XML });
  });

  return createZipBytes(files);
}

/**
 * Generate and download a PowerPoint `.pptx` file in the browser.
 * @param {object} lessonData
 * @returns {string} downloaded file name
 */
export function exportBloomLessonToPptx(lessonData) {
  const bytes = buildBloomLessonPptxBytes(lessonData);
  const fileName = `Slide_Bai_Giang_Bloom_${new Date().toISOString().slice(0, 10)}.pptx`;
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return fileName;
}
