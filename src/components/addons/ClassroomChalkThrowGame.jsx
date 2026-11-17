import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Award, Crosshair, RotateCcw, Sparkles, Target, Users } from 'lucide-react';

// Exact deterministic SVG coordinate constants inside viewBox="0 0 1000 720"
// 10 columns split into: Cols 1-3 | Aisle | Cols 4-7 | Aisle | Cols 8-10
const COLS_X = [85, 167, 249, 377, 459, 541, 623, 751, 833, 915];
const ROW_START_Y = 200;
const ROW_PITCH = 51;
const TEACHER_POS = { x: 500, y: 124 };

// Three-phase throw timing (ms)
const PHASE1_END = 1200; // Aiming / Radar sweep
const PHASE2_END = 2750; // Parabolic chalk flight
const IMPACT_DECAY_MS = 900; // Chalk-dust burst & shockwave ring fade duration

const SHIRT_PALETTE = [
  { fill: '#6366f1', stroke: '#4338ca' }, // indigo
  { fill: '#14b8a6', stroke: '#0f766e' }, // teal
  { fill: '#f59e0b', stroke: '#b45309' }, // amber
  { fill: '#f43f5e', stroke: '#be123c' }, // rose
  { fill: '#0ea5e9', stroke: '#0369a1' }, // sky
  { fill: '#10b981', stroke: '#047857' }, // emerald
  { fill: '#8b5cf6', stroke: '#6d28d9' }, // violet
  { fill: '#f97316', stroke: '#c2410c' }, // orange
];

const SKIN_TONES = ['#fde2c8', '#f7d1b1', '#eec099'];
const HAIR_TONES = ['#1e293b', '#292524', '#3b2b20'];

// Precomputed deterministic radial impact particles for Phase 3 chalk-dust burst
const BURST_PARTICLES = Array.from({ length: 22 }, (_, idx) => {
  const baseAngle = (idx / 22) * Math.PI * 2;
  const angleJitter = ((idx * 37) % 13 - 6) * 0.035;
  const speed = 26 + ((idx * 19) % 34);
  const radius = 2.2 + ((idx * 7) % 4) * 0.7;
  const isShard = idx % 3 === 0;
  const color = idx % 5 === 0 ? '#fde68a' : idx % 4 === 0 ? '#bae6fd' : '#ffffff';
  return {
    id: idx,
    angle: baseAngle + angleJitter,
    speed,
    radius,
    isShard,
    rotOffset: (idx * 53) % 180,
    color,
  };
});

function getDeskPosition(index) {
  const row = Math.floor(index / 10);
  const col = index % 10;
  const seatNumber = index + 1;
  return {
    index,
    row,
    col,
    seatNumber,
    seatLabel: String(seatNumber).padStart(2, '0'),
    x: COLS_X[col],
    y: ROW_START_Y + row * ROW_PITCH,
  };
}

function getShortLastName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] || 'SV';
}

function hashCodeStr(str) {
  let hash = 0;
  const text = String(str || '');
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function findSeatIndexByCode(students, activeCount, studentObj) {
  if (activeCount <= 0) return -1;
  const targetCode = String(studentObj?.studentCode || studentObj?.code || '').trim();
  if (!targetCode) return 0;
  const matched = students.slice(0, activeCount).findIndex(
    (s) => String(s?.code || s?.studentCode || '').trim() === targetCode
  );
  return matched >= 0 ? matched : 0;
}

function getTeacherHandPos(angleDeg, handExt = 21, handLat = 11) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: TEACHER_POS.x + handExt * Math.cos(rad) - handLat * Math.sin(rad),
    y: TEACHER_POS.y + handExt * Math.sin(rad) + handLat * Math.cos(rad),
  };
}

function computeAimAngleDeg(targetPos) {
  if (!targetPos) return 90;
  const dx = targetPos.x - TEACHER_POS.x;
  const dy = targetPos.y - TEACHER_POS.y;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function lerpAngleDeg(fromDeg, toDeg, factor) {
  const diff = ((((toDeg - fromDeg) % 360) + 540) % 360) - 180;
  return fromDeg + diff * factor;
}

function sampleParabolicPoint(startPos, targetPos, p) {
  const clampedP = Math.max(0, Math.min(1, p));
  const dx = targetPos.x - startPos.x;
  const dy = targetPos.y - startPos.y;
  const dist = Math.hypot(dx, dy);

  // Subtle lateral bow ensures throws straight down center columns still visibly arc
  const arcSign = dx >= 0 ? 1 : -1;
  const lateralBow = Math.min(44, 18 + dist * 0.045) * arcSign;
  const perpX = dist > 1 ? -dy / dist : 1;
  const perpY = dist > 1 ? dx / dist : 0;
  const bowFactor = Math.sin(clampedP * Math.PI);

  const groundX = startPos.x + dx * clampedP + perpX * lateralBow * bowFactor;
  const groundY = startPos.y + dy * clampedP + perpY * lateralBow * bowFactor;

  // Parabolic altitude z(p) = 4 * hMax * p * (1 - p)
  const hMax = Math.max(82, Math.min(168, dist * 0.28));
  const z = 4 * hMax * clampedP * (1 - clampedP);
  const zRatio = hMax > 0 ? z / hMax : 0;

  return {
    groundX,
    groundY,
    chalkX: groundX,
    chalkY: groundY - z * 0.62,
    shadowX: groundX + z * 0.24,
    shadowY: groundY + z * 0.34,
    chalkScale: 1 + 0.85 * zRatio,
    shadowScale: 1 + 0.38 * zRatio,
    shadowOpacity: 0.38 - 0.22 * zRatio,
    zRatio,
  };
}

function computeChalkArcState(startPos, targetPos, p) {
  const head = sampleParabolicPoint(startPos, targetPos, p);
  const prev = sampleParabolicPoint(startPos, targetPos, Math.max(0, p - 0.02));
  const tangentDeg = (Math.atan2(head.chalkY - prev.chalkY, head.chalkX - prev.chalkX) * 180) / Math.PI;

  const trail = [];
  const trailSteps = 12;
  for (let i = 1; i <= trailSteps; i += 1) {
    const tp = p - i * 0.017;
    if (tp <= 0) break;
    const pt = sampleParabolicPoint(startPos, targetPos, tp);
    const fade = 1 - i / (trailSteps + 1);
    const jitter = ((i % 2 === 0 ? 1 : -1) * (i * 0.45));
    trail.push({
      id: i,
      x: pt.chalkX + jitter,
      y: pt.chalkY + (i % 3 === 0 ? -1.4 : 1.2),
      opacity: fade * 0.72,
      scale: Math.max(0.35, pt.chalkScale * fade * 0.85),
      tiltDeg: tangentDeg + (i % 2 === 0 ? 8 : -8),
    });
  }

  return {
    ...head,
    chalkRotDeg: tangentDeg + p * 780,
    trail,
  };
}

const ClassroomDesksLayer = React.memo(function ClassroomDesksLayer({
  desks,
  students,
  activeCount,
  reticleIndex,
  highlightedIndex,
  spotlightGradId,
  onHoverDesk,
}) {
  return (
    <g>
      {desks.map((desk) => {
        const isOccupied = desk.index < activeCount;
        const student = isOccupied ? students[desk.index] : null;
        const isReticle = reticleIndex === desk.index;
        const isHighlighted = highlightedIndex === desk.index;

        if (!isOccupied) {
          return (
            <g
              key={desk.index}
              transform={`translate(${desk.x}, ${desk.y})`}
              className="cursor-pointer transition-opacity duration-200"
              onClick={() => onHoverDesk?.({ empty: true, seatLabel: desk.seatLabel })}
              onMouseEnter={() => onHoverDesk?.({ empty: true, seatLabel: desk.seatLabel })}
              onMouseLeave={() => onHoverDesk?.(null)}
            >
              <title>{`Bàn trống • Ghế #${desk.seatLabel}`}</title>
              {/* Empty chair tucked behind desk */}
              <rect
                x="-12"
                y="1"
                width="24"
                height="9"
                rx="3"
                className="fill-slate-300/45 dark:fill-slate-800/45 stroke-slate-400/50 dark:stroke-slate-700/60"
                strokeWidth="1"
              />
              {/* Dimmed empty desk */}
              <rect
                x="-30"
                y="-17"
                width="60"
                height="17"
                rx="4"
                className="fill-slate-200/65 dark:fill-slate-800/55 stroke-slate-300 dark:stroke-slate-700"
                strokeWidth="1.2"
                strokeDasharray="3 2"
              />
              <text
                x="0"
                y="-6"
                textAnchor="middle"
                fontSize="7.5"
                fontWeight="700"
                className="fill-slate-400 dark:fill-slate-500"
              >
                Trống
              </text>
              <text
                x="0"
                y="23"
                textAnchor="middle"
                fontSize="8"
                fontWeight="600"
                className="fill-slate-400 dark:fill-slate-600"
              >
                {`Trống • ${desk.seatLabel}`}
              </text>
            </g>
          );
        }

        const stuCode = String(student?.code || student?.studentCode || '');
        const stuName = String(student?.name || student?.fullName || `Sinh viên #${desk.seatLabel}`);
        const shortName = getShortLastName(stuName);
        const seed = hashCodeStr(stuCode || stuName) + desk.index;
        const shirt = SHIRT_PALETTE[seed % SHIRT_PALETTE.length];
        const skin = SKIN_TONES[seed % SKIN_TONES.length];
        const hair = HAIR_TONES[(seed + 1) % HAIR_TONES.length];

        return (
          <g
            key={desk.index}
            transform={`translate(${desk.x}, ${desk.y})`}
            className="cursor-pointer transition-[filter] duration-150 hover:brightness-110"
            onClick={() =>
              onHoverDesk?.({
                empty: false,
                name: stuName,
                code: stuCode,
                seatLabel: desk.seatLabel,
              })
            }
            onMouseEnter={() =>
              onHoverDesk?.({
                empty: false,
                name: stuName,
                code: stuCode,
                seatLabel: desk.seatLabel,
              })
            }
            onMouseLeave={() => onHoverDesk?.(null)}
          >
            <title>{`${stuName} • MSSV: ${stuCode || 'N/A'} (Ghế #${desk.seatLabel})`}</title>

            {/* Golden spotlight halo when picked */}
            {isHighlighted && (
              <g>
                <circle cx="0" cy="-2" r="44" fill={`url(#${spotlightGradId})`} />
                <circle
                  cx="0"
                  cy="-2"
                  r="33"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2.2"
                  className="animate-pulse"
                />
                <circle
                  cx="0"
                  cy="-2"
                  r="39"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.2"
                  strokeDasharray="4 3"
                  opacity="0.8"
                />
              </g>
            )}

            {/* Reticle target hover wash */}
            {isReticle && !isHighlighted && (
              <rect
                x="-36"
                y="-22"
                width="72"
                height="48"
                rx="9"
                fill="rgba(56, 189, 248, 0.16)"
                stroke="#38bdf8"
                strokeWidth="1.5"
              />
            )}

            {/* Subtle desk shadow */}
            <rect
              x="-29"
              y="-15"
              width="60"
              height="17"
              rx="4"
              fill="rgba(15, 23, 42, 0.14)"
            />

            {/* Wooden desk top */}
            <rect
              x="-30"
              y="-17"
              width="60"
              height="17"
              rx="4"
              className={
                isHighlighted
                  ? 'fill-amber-200 dark:fill-amber-900/80 stroke-amber-500 dark:stroke-amber-400'
                  : 'fill-[#e6c294] dark:fill-[#543c29] stroke-[#b78449] dark:stroke-[#826042]'
              }
              strokeWidth={isHighlighted ? '2.2' : '1.2'}
            />

            {/* Seat # micro-tag */}
            <text
              x="-25"
              y="-6.5"
              fontSize="6.5"
              fontWeight="800"
              className={
                isHighlighted
                  ? 'fill-amber-900 dark:fill-amber-200'
                  : 'fill-[#6b4623] dark:fill-amber-200/75'
              }
            >
              {desk.seatLabel}
            </text>

            {/* Open white notebook on desk */}
            <g transform="translate(2, -13.5)">
              <rect
                x="-8.5"
                y="0"
                width="17"
                height="10.5"
                rx="1.5"
                fill="#ffffff"
                stroke="#cbd5e1"
                strokeWidth="0.7"
              />
              <line x1="0" y1="0.8" x2="0" y2="9.7" stroke="#94a3b8" strokeWidth="0.6" />
              <line x1="-6.5" y1="3.4" x2="-1.5" y2="3.4" stroke="#cbd5e1" strokeWidth="0.7" />
              <line x1="-6.5" y1="6.2" x2="-1.5" y2="6.2" stroke="#cbd5e1" strokeWidth="0.7" />
              <line x1="1.5" y1="3.4" x2="6.5" y2="3.4" stroke="#cbd5e1" strokeWidth="0.7" />
              <line x1="1.5" y1="6.2" x2="5.5" y2="6.2" stroke="#38bdf8" strokeWidth="0.7" />
              {/* Tiny pen beside notebook */}
              <line
                x1="10.5"
                y1="1.5"
                x2="13"
                y2="9"
                stroke="#2563eb"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </g>

            {/* Chair backrest behind student */}
            <path
              d="M -11 10.5 Q 0 15.5 11 10.5"
              fill="none"
              className="stroke-slate-500/70 dark:stroke-slate-400/55"
              strokeWidth="2.4"
              strokeLinecap="round"
            />

            {/* Top-down student shoulders / shirt */}
            <ellipse
              cx="0"
              cy="5.2"
              rx="13.5"
              ry="6"
              fill={shirt.fill}
              stroke={isHighlighted ? '#fbbf24' : shirt.stroke}
              strokeWidth={isHighlighted ? '1.6' : '1'}
            />

            {/* Top-down student head facing UP (-Y) toward chalkboard */}
            <circle cx="0" cy="1.6" r="6.2" fill={skin} stroke="rgba(15,23,42,0.22)" strokeWidth="0.7" />

            {/* Top-down hair cap (covers back/crown toward +Y, leaving forehead edge toward -Y) */}
            {seed % 3 === 0 ? (
              <path
                d="M -6.1 1.4 A 6.2 6.2 0 1 0 6.1 1.4 Q 3.2 -2.2 0 -1.4 Q -3.2 -2.2 -6.1 1.4 Z"
                fill={hair}
              />
            ) : seed % 3 === 1 ? (
              <path
                d="M -6.1 1.6 A 6.2 6.2 0 1 0 6.1 1.6 Q 2 -2.8 -1 -1.8 Q -4 -1 -6.1 1.6 Z"
                fill={hair}
              />
            ) : (
              <path
                d="M -6.3 0.8 A 6.4 6.4 0 1 0 6.3 0.8 Q 0 -3.2 -6.3 0.8 Z"
                fill={hair}
              />
            )}

            {/* Short label below desk: "An • 01" */}
            <text
              x="0"
              y="23.5"
              textAnchor="middle"
              fontSize="9"
              fontWeight={isHighlighted ? '900' : '700'}
              className={
                isHighlighted
                  ? 'fill-amber-700 dark:fill-amber-300'
                  : 'fill-slate-700 dark:fill-slate-200'
              }
            >
              {`${shortName} • ${desk.seatLabel}`}
            </text>
          </g>
        );
      })}
    </g>
  );
});

export default function ClassroomChalkThrowGame({
  students = [],
  maxSeats = 100,
  isThrowing = false,
  targetStudent = null,
  pickedStudent = null,
  onTriggerThrow,
  onReset,
}) {
  const uid = useId().replace(/:/g, '');
  const chalkboardGradId = `chalkboard-grad-${uid}`;
  const podiumGradId = `podium-grad-${uid}`;
  const spotlightGradId = `spotlight-grad-${uid}`;
  const chalkGlowGradId = `chalk-glow-${uid}`;
  const tilePatternId = `tile-grid-${uid}`;

  const safeMaxSeats = Math.max(1, Number(maxSeats) || 100);
  const normalizedStudents = useMemo(
    () => (Array.isArray(students) ? students : []),
    [students]
  );
  const activeCount = Math.min(normalizedStudents.length, safeMaxSeats);
  const emptyCount = Math.max(0, safeMaxSeats - activeCount);

  const desks = useMemo(
    () => Array.from({ length: safeMaxSeats }, (_, i) => getDeskPosition(i)),
    [safeMaxSeats]
  );

  const totalRows = Math.ceil(safeMaxSeats / 10);
  const viewBoxHeight = totalRows <= 10 ? 720 : ROW_START_Y + totalRows * ROW_PITCH + 50;

  const pickedSeatIndex = useMemo(() => {
    if (!pickedStudent || activeCount <= 0) return -1;
    return findSeatIndexByCode(normalizedStudents, activeCount, pickedStudent);
  }, [pickedStudent, normalizedStudents, activeCount]);

  const targetSeatIndexNow = useMemo(() => {
    if (!targetStudent || activeCount <= 0) return activeCount > 0 ? 0 : -1;
    return findSeatIndexByCode(normalizedStudents, activeCount, targetStudent);
  }, [targetStudent, normalizedStudents, activeCount]);

  // Animation state isolated to lightweight visual overlay & teacher angle
  const [animState, setAnimState] = useState({
    phase: 'idle', // 'idle' | 'aiming' | 'flying' | 'impact'
    teacherAngleDeg: 90,
    handExt: 20,
    reticleIndex: -1,
    chalkArc: null,
    impactPos: null,
    impactProgress: 0,
    aimLineTarget: null,
  });

  const [hoveredDesk, setHoveredDesk] = useState(null);

  // Refs so live RAF loop always reads latest props without restarting mid-throw
  const targetStudentRef = useRef(targetStudent);
  const pickedStudentRef = useRef(pickedStudent);
  const studentsRef = useRef(normalizedStudents);
  const activeCountRef = useRef(activeCount);
  const desksRef = useRef(desks);
  const rafRef = useRef(null);
  const impactRafRef = useRef(null);
  const throwActiveRef = useRef(false);
  const throwStartRef = useRef(0);
  const throwCompletedImpactRef = useRef(false);
  const lastLockedTargetPosRef = useRef(null);

  targetStudentRef.current = targetStudent;
  pickedStudentRef.current = pickedStudent;
  studentsRef.current = normalizedStudents;
  activeCountRef.current = activeCount;
  desksRef.current = desks;

  useEffect(() => {
    // Cancel any previous RAF loops cleanly on state transitions
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!isThrowing) {
      // If throw just finished after landing (Phase 3 reached), let impact burst decay gracefully
      if (throwActiveRef.current && throwCompletedImpactRef.current) {
        const impactStartTime = throwStartRef.current + PHASE2_END;
        const fallbackStudent = targetStudentRef.current || pickedStudentRef.current;
        const idx = findSeatIndexByCode(
          studentsRef.current,
          activeCountRef.current,
          fallbackStudent
        );
        const landingPos =
          lastLockedTargetPosRef.current ||
          (idx >= 0 ? desksRef.current[idx] : { x: 500, y: 380 });
        const aimAngle = computeAimAngleDeg(landingPos);

        const stepDecay = (now) => {
          const impactElapsed = now - impactStartTime;
          if (impactElapsed >= IMPACT_DECAY_MS) {
            setAnimState({
              phase: 'idle',
              teacherAngleDeg: 90,
              handExt: 20,
              reticleIndex: -1,
              chalkArc: null,
              impactPos: null,
              impactProgress: 0,
              aimLineTarget: null,
            });
            impactRafRef.current = null;
            return;
          }
          const progress = Math.max(0, Math.min(1, impactElapsed / IMPACT_DECAY_MS));
          const easedReturn = 1 - Math.pow(1 - progress, 2);
          setAnimState((prev) => ({
            ...prev,
            phase: 'idle',
            teacherAngleDeg: lerpAngleDeg(aimAngle, 90, easedReturn),
            handExt: 20,
            reticleIndex: -1,
            chalkArc: null,
            impactPos: landingPos,
            impactProgress: progress,
            aimLineTarget: null,
          }));
          impactRafRef.current = requestAnimationFrame(stepDecay);
        };
        impactRafRef.current = requestAnimationFrame(stepDecay);
      } else {
        setAnimState({
          phase: 'idle',
          teacherAngleDeg: 90,
          handExt: 20,
          reticleIndex: -1,
          chalkArc: null,
          impactPos: null,
          impactProgress: 0,
          aimLineTarget: null,
        });
      }

      throwActiveRef.current = false;
      throwCompletedImpactRef.current = false;
      return () => {
        if (impactRafRef.current) {
          cancelAnimationFrame(impactRafRef.current);
          impactRafRef.current = null;
        }
      };
    }

    // Starting a new throw
    if (impactRafRef.current) {
      cancelAnimationFrame(impactRafRef.current);
      impactRafRef.current = null;
    }

    throwActiveRef.current = true;
    throwCompletedImpactRef.current = false;
    lastLockedTargetPosRef.current = null;
    const startTime = performance.now();
    throwStartRef.current = startTime;

    let currentAngle = 90;
    let lastHopTime = -999;
    let currentReticle = activeCountRef.current > 0 ? Math.floor(Math.random() * activeCountRef.current) : -1;
    let lockedTargetIdx = -1;
    let lockedLaunchPos = null;
    let lockedTargetPos = null;
    let lockedLaunchAngle = 90;

    const tick = (now) => {
      const elapsed = now - startTime;
      const count = activeCountRef.current;
      const allDesks = desksRef.current;

      // Resolve current intended target index (updates dynamically as async targetStudent arrives)
      const resolvedIdx = findSeatIndexByCode(
        studentsRef.current,
        count,
        targetStudentRef.current
      );
      const resolvedDesk = resolvedIdx >= 0 ? allDesks[resolvedIdx] : { x: 500, y: 380 };

      if (elapsed < PHASE1_END) {
        // Phase 1 (0 - 1200ms): Aiming & Radar Sweep across occupied student desks
        const hopInterval = elapsed < 750 ? 90 : 125;
        if (count > 0 && elapsed - lastHopTime >= hopInterval) {
          lastHopTime = elapsed;
          if (count === 1) {
            currentReticle = 0;
          } else {
            let nextIdx = Math.floor(Math.random() * count);
            if (nextIdx === currentReticle) {
              nextIdx = (nextIdx + 1) % count;
            }
            currentReticle = nextIdx;
          }
        }

        const reticleDesk = currentReticle >= 0 ? allDesks[currentReticle] : resolvedDesk;
        // Blend aim smoothly toward target angle in final 200ms of Phase 1 for seamless release
        const lockBlendStart = PHASE1_END - 220;
        if (elapsed >= lockBlendStart) {
          const tLock = Math.min(1, (elapsed - lockBlendStart) / 200);
          const desiredAngle = computeAimAngleDeg(resolvedDesk);
          currentAngle = lerpAngleDeg(currentAngle, desiredAngle, Math.max(0.28, tLock * tLock));
        } else {
          const desiredAngle = computeAimAngleDeg(reticleDesk);
          currentAngle = lerpAngleDeg(currentAngle, desiredAngle, 0.18);
        }

        // Cock throwing arm back gently (850-1120ms) then thrust forward into release (1120-1200ms)
        let handExt = 20;
        if (elapsed > 850 && elapsed <= 1120) {
          const windUp = (elapsed - 850) / 270;
          handExt = 20 - windUp * 7; // 20 -> 13
        } else if (elapsed > 1120) {
          const thrust = Math.min(1, (elapsed - 1120) / 80);
          handExt = 13 + thrust * 9; // 13 -> 22
        }

        setAnimState({
          phase: 'aiming',
          teacherAngleDeg: currentAngle,
          handExt,
          reticleIndex: currentReticle,
          chalkArc: null,
          impactPos: null,
          impactProgress: 0,
          aimLineTarget: reticleDesk,
        });

        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      // Lock launch trajectory at Phase 2 start (1200ms)
      if (lockedTargetIdx === -1 && count > 0) {
        lockedTargetIdx = resolvedIdx;
        lockedTargetPos = allDesks[lockedTargetIdx];
        lastLockedTargetPosRef.current = lockedTargetPos;
        lockedLaunchAngle = computeAimAngleDeg(lockedTargetPos);
        lockedLaunchPos = getTeacherHandPos(lockedLaunchAngle, 22, 11);
      } else if (!lockedTargetPos) {
        lockedTargetPos = { x: 500, y: 380 };
        lastLockedTargetPosRef.current = lockedTargetPos;
        lockedLaunchAngle = 90;
        lockedLaunchPos = getTeacherHandPos(90, 22, 11);
      }

      if (elapsed < PHASE2_END) {
        // Phase 2 (1200 - 2750ms): Parabolic Chalk Throw
        const flightP = (elapsed - PHASE1_END) / (PHASE2_END - PHASE1_END);
        const arc = computeChalkArcState(lockedLaunchPos, lockedTargetPos, flightP);

        // Brief follow-through from 22 -> 25 then relax back to 20
        const followT = Math.min(1, (elapsed - PHASE1_END) / 280);
        const handExt = followT < 0.35 ? 22 + (followT / 0.35) * 3 : 25 - ((followT - 0.35) / 0.65) * 5;

        setAnimState({
          phase: 'flying',
          teacherAngleDeg: lockedLaunchAngle,
          handExt,
          reticleIndex: -1,
          chalkArc: arc,
          impactPos: null,
          impactProgress: 0,
          aimLineTarget: null,
        });

        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      // Phase 3 (2750ms+): Impact & Chalk-Dust Burst + Expanding Shockwaves
      throwCompletedImpactRef.current = true;
      const impactElapsed = elapsed - PHASE2_END;
      const impactProgress = Math.min(1, impactElapsed / IMPACT_DECAY_MS);

      setAnimState({
        phase: 'impact',
        teacherAngleDeg: lockedLaunchAngle,
        handExt: 20,
        reticleIndex: lockedTargetIdx,
        chalkArc: null,
        impactPos: lockedTargetPos,
        impactProgress,
        aimLineTarget: null,
      });

      if (impactProgress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isThrowing]);

  // Also clear any residual impact decay if parent triggers external reset
  useEffect(() => {
    if (!isThrowing && !pickedStudent && !targetStudent) {
      lastLockedTargetPosRef.current = null;
      if (impactRafRef.current) {
        cancelAnimationFrame(impactRafRef.current);
        impactRafRef.current = null;
        setAnimState({
          phase: 'idle',
          teacherAngleDeg: 90,
          handExt: 20,
          reticleIndex: -1,
          chalkArc: null,
          impactPos: null,
          impactProgress: 0,
          aimLineTarget: null,
        });
      }
    }
  }, [isThrowing, pickedStudent, targetStudent]);

  // Clear residual impact burst if parent resets
  const handleResetClick = () => {
    if (isThrowing) return;
    lastLockedTargetPosRef.current = null;
    if (impactRafRef.current) {
      cancelAnimationFrame(impactRafRef.current);
      impactRafRef.current = null;
    }
    throwActiveRef.current = false;
    throwCompletedImpactRef.current = false;
    setAnimState({
      phase: 'idle',
      teacherAngleDeg: 90,
      handExt: 20,
      reticleIndex: -1,
      chalkArc: null,
      impactPos: null,
      impactProgress: 0,
      aimLineTarget: null,
    });
    onReset?.();
  };

  // Determine which desk should show persistent hit highlight
  const activeHighlightedIndex =
    isThrowing && animState.phase === 'impact'
      ? (animState.reticleIndex >= 0 ? animState.reticleIndex : targetSeatIndexNow)
      : !isThrowing && pickedStudent
        ? pickedSeatIndex
        : -1;

  const highlightedDesk =
    activeHighlightedIndex >= 0 && activeHighlightedIndex < desks.length
      ? desks[activeHighlightedIndex]
      : null;

  // Dynamic status copy matching all 3 phases + picked + idle
  const statusBanner = (() => {
    if (isThrowing) {
      if (animState.phase === 'flying') {
        return {
          text: '💨 Phấn đang bay xuyên lớp học...',
          tone: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-400/40',
          dot: 'bg-sky-500 animate-ping',
        };
      }
      if (animState.phase === 'impact') {
        return {
          text: '💥 Trúng bàn mục tiêu! Đang ghi nhận kết quả...',
          tone: 'bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2] border-emerald-400/40',
          dot: 'bg-emerald-500 animate-ping',
        };
      }
      return {
        text: '🎯 Thầy đang ngắm mục tiêu ngẫu nhiên...',
        tone: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/40',
        dot: 'bg-amber-500 animate-ping',
      };
    }

    if (pickedStudent) {
      return {
        text: `🎯 TRÚNG PHẤN! ${pickedStudent.fullName} (${pickedStudent.studentCode})`,
        tone: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-400/50',
        dot: 'bg-amber-500',
      };
    }

    return {
      text: '✨ Sẵn sàng ném phấn gọi tên ngẫu nhiên',
      tone: 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      dot: 'bg-emerald-500',
    };
  })();

  const teacherHandWorld = getTeacherHandPos(animState.teacherAngleDeg, animState.handExt, 11);
  const showChalkInHand = !isThrowing || animState.phase === 'aiming';
  const liveAimReadout =
    isThrowing && animState.phase === 'flying'
      ? 'Đang bay tới bàn...'
      : isThrowing && animState.phase === 'aiming'
        ? `Góc ngắm: ${Math.round(animState.teacherAngleDeg)}°`
        : pickedStudent && highlightedDesk
          ? `Trúng ghế #${highlightedDesk.seatLabel}`
          : 'Sẵn sàng ném phấn';

  const reticleDesk =
    isThrowing && animState.phase === 'aiming' && animState.reticleIndex >= 0
      ? desks[animState.reticleIndex]
      : null;

  return (
    <div className="space-y-3 select-none">
      {/* Top Classroom HUD Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600/15 text-emerald-800 dark:text-[#00dfa2] text-[11px] font-extrabold border border-emerald-500/25">
            <Users className="w-3.5 h-3.5" />
            <span>{`Sĩ số: ${activeCount}/${safeMaxSeats} chỗ ngồi`}</span>
          </span>
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
            GV: <strong className="text-slate-900 dark:text-white">ThS. Phạm Văn Thuận</strong>
          </span>
        </div>

        <div
          role="status"
          aria-live="polite"
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-extrabold transition-colors ${statusBanner.tone}`}
        >
          <span className={`w-2 h-2 rounded-full ${statusBanner.dot}`} />
          <span>{statusBanner.text}</span>
        </div>
      </div>

      {/* Mobile Touch Hint */}
      <div className="sm:hidden text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
        <span>📱 Vuốt ngang để xem toàn bộ bàn học • Chạm vào ghế để xem SV</span>
      </div>

      {/* Responsive 2D Top-Down Classroom SVG Stage */}
      <div className="relative rounded-2xl overflow-x-auto no-scrollbar border border-slate-200 dark:border-slate-800 bg-[#edf4f5] dark:bg-[#070d19] shadow-inner">
        <svg
          viewBox={`0 0 1000 ${viewBoxHeight}`}
          className="w-full min-w-[620px] sm:min-w-0 h-auto block"
          role="img"
          aria-label="Mô phỏng lớp học 2D từ trên xuống - Trò chơi ném phấn gọi tên lớp CNTT K26"
        >
          <defs>
            {/* Floor tile grid */}
            <pattern id={tilePatternId} width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                className="stroke-slate-300/45 dark:stroke-slate-800/75"
                strokeWidth="0.8"
              />
            </pattern>

            {/* Green Chalkboard gradient */}
            <linearGradient id={chalkboardGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1b4d37" />
              <stop offset="55%" stopColor="#123a29" />
              <stop offset="100%" stopColor="#0c2a1e" />
            </linearGradient>

            {/* Wooden Podium gradient */}
            <linearGradient id={podiumGradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d9a16c" />
              <stop offset="100%" stopColor="#b5763f" />
            </linearGradient>

            {/* Golden hit spotlight radial gradient */}
            <radialGradient id={spotlightGradId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.65" />
              <stop offset="55%" stopColor="#f59e0b" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>

            {/* Airborne white chalk radial glow */}
            <radialGradient id={chalkGlowGradId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="45%" stopColor="#bae6fd" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Classroom Floor Background */}
          <rect
            x="10"
            y="8"
            width="980"
            height={viewBoxHeight - 16}
            rx="18"
            className="fill-[#f3f8f8] dark:fill-[#0a1220] stroke-slate-300 dark:stroke-slate-700"
            strokeWidth="2"
          />
          <rect
            x="12"
            y="10"
            width="976"
            height={viewBoxHeight - 20}
            rx="16"
            fill={`url(#${tilePatternId})`}
          />

          {/* Two Vertical Walking Aisles (Cols 1-3 | Aisle | Cols 4-7 | Aisle | Cols 8-10) */}
          <g>
            {/* Left Walking Aisle */}
            <rect
              x="291"
              y="162"
              width="44"
              height={viewBoxHeight - 180}
              rx="10"
              className="fill-slate-200/55 dark:fill-slate-900/65"
            />
            <line
              x1="313"
              y1="176"
              x2="313"
              y2={viewBoxHeight - 34}
              className="stroke-slate-300 dark:stroke-slate-700/80"
              strokeWidth="1.5"
              strokeDasharray="6 6"
            />
            <text
              x="313"
              y={viewBoxHeight - 22}
              textAnchor="middle"
              fontSize="7.5"
              fontWeight="800"
              letterSpacing="1"
              className="fill-slate-400 dark:fill-slate-600"
            >
              LỐI ĐI
            </text>

            {/* Right Walking Aisle */}
            <rect
              x="665"
              y="162"
              width="44"
              height={viewBoxHeight - 180}
              rx="10"
              className="fill-slate-200/55 dark:fill-slate-900/65"
            />
            <line
              x1="687"
              y1="176"
              x2="687"
              y2={viewBoxHeight - 34}
              className="stroke-slate-300 dark:stroke-slate-700/80"
              strokeWidth="1.5"
              strokeDasharray="6 6"
            />
            <text
              x="687"
              y={viewBoxHeight - 22}
              textAnchor="middle"
              fontSize="7.5"
              fontWeight="800"
              letterSpacing="1"
              className="fill-slate-400 dark:fill-slate-600"
            >
              LỐI ĐI
            </text>
          </g>

          {/* Row Numbers along Left & Right Margins */}
          {Array.from({ length: totalRows }, (_, rowIdx) => {
            const ry = ROW_START_Y + rowIdx * ROW_PITCH;
            return (
              <g key={rowIdx}>
                <text
                  x="29"
                  y={ry + 2}
                  textAnchor="middle"
                  fontSize="8.5"
                  fontWeight="800"
                  className="fill-slate-400 dark:fill-slate-600"
                >
                  {`H${rowIdx + 1}`}
                </text>
                <text
                  x="971"
                  y={ry + 2}
                  textAnchor="middle"
                  fontSize="8.5"
                  fontWeight="800"
                  className="fill-slate-400 dark:fill-slate-600"
                >
                  {`H${rowIdx + 1}`}
                </text>
              </g>
            );
          })}

          {/* =============================================================== */}
          {/* TOP CHALKBOARD & WOODEN PODIUM ZONE                             */}
          {/* =============================================================== */}
          <g>
            {/* Left HUD Plaque */}
            <rect
              x="24"
              y="18"
              width="164"
              height="56"
              rx="10"
              className="fill-white/90 dark:fill-[#0f1a2e] stroke-slate-200 dark:stroke-slate-700"
              strokeWidth="1.4"
            />
            <text
              x="36"
              y="34"
              fontSize="8"
              fontWeight="800"
              letterSpacing="0.5"
              className="fill-slate-400 dark:fill-slate-400"
            >
              TRẠNG THÁI GIẢNG ĐƯỜNG
            </text>
            <text
              x="36"
              y="50"
              fontSize="11"
              fontWeight="900"
              className="fill-slate-800 dark:fill-white"
            >
              {`Sĩ số: ${activeCount}/${safeMaxSeats} chỗ ngồi`}
            </text>
            {/* Mini Capacity Bar */}
            <rect
              x="36"
              y="58"
              width="140"
              height="6"
              rx="3"
              className="fill-slate-200 dark:fill-slate-800"
            />
            <rect
              x="36"
              y="58"
              width={Math.max(4, Math.round((140 * activeCount) / safeMaxSeats))}
              height="6"
              rx="3"
              className="fill-emerald-500 dark:fill-[#00dfa2]"
            />

            {/* Center Green/Slate Chalkboard */}
            <rect
              x="200"
              y="14"
              width="600"
              height="60"
              rx="6"
              fill="#7c4f28"
              stroke="#5b3719"
              strokeWidth="2"
            />
            <rect
              x="207"
              y="19"
              width="586"
              height="48"
              rx="3"
              fill={`url(#${chalkboardGradId})`}
              stroke="#1f5e42"
              strokeWidth="1"
            />
            {/* Chalk dust smudges */}
            <ellipse cx="320" cy="40" rx="45" ry="12" fill="rgba(255,255,255,0.035)" />
            <ellipse cx="670" cy="44" rx="52" ry="11" fill="rgba(255,255,255,0.03)" />

            <text
              x="500"
              y="38"
              textAnchor="middle"
              fontSize="14.5"
              fontWeight="900"
              letterSpacing="0.6"
              fill="#f8fafc"
            >
              BẢNG ĐEN GIẢNG ĐƯỜNG • LỚP CNTT K26
            </text>
            <text
              x="500"
              y="56"
              textAnchor="middle"
              fontSize="10.5"
              fontWeight="700"
              fill="#a7f3d0"
            >
              {`Giảng viên: ThS. Phạm Văn Thuận  •  Hiện diện: ${activeCount}/${safeMaxSeats} chỗ`}
            </text>

            {/* Bottom Chalk Tray Ledge with Chalk Sticks & Eraser */}
            <rect x="260" y="68" width="480" height="7" rx="2" fill="#925e31" />
            <rect x="295" y="69" width="22" height="4" rx="1" fill="#334155" />
            <rect x="650" y="69.5" width="16" height="3" rx="1" fill="#ffffff" />
            <rect x="670" y="69.5" width="14" height="3" rx="1" fill="#fde047" />
            <rect x="688" y="69.5" width="14" height="3" rx="1" fill="#f9a8d4" />

            {/* Right Legend / Telemetry Plaque */}
            <rect
              x="812"
              y="18"
              width="164"
              height="56"
              rx="10"
              className="fill-white/90 dark:fill-[#0f1a2e] stroke-slate-200 dark:stroke-slate-700"
              strokeWidth="1.4"
            />
            <circle cx="828" cy="34" r="4.5" fill="#14b8a6" />
            <text
              x="838"
              y="37"
              fontSize="9"
              fontWeight="700"
              className="fill-slate-700 dark:fill-slate-200"
            >
              {`Đang ngồi (${activeCount})`}
            </text>
            <rect
              x="899"
              y="29.5"
              width="11"
              height="8"
              rx="2"
              className="fill-slate-300 dark:fill-slate-700"
            />
            <text
              x="915"
              y="37"
              fontSize="9"
              fontWeight="700"
              className="fill-slate-500 dark:fill-slate-400"
            >
              {`Trống (${emptyCount})`}
            </text>
            <text
              x="824"
              y="58"
              fontSize="9.5"
              fontWeight="800"
              className="fill-amber-600 dark:fill-amber-300"
            >
              {liveAimReadout}
            </text>

            {/* Wooden Podium Stage (Bục giảng) */}
            <rect
              x="342"
              y="81"
              width="320"
              height="67"
              rx="10"
              fill="rgba(15, 23, 42, 0.14)"
            />
            <rect
              x="340"
              y="78"
              width="320"
              height="67"
              rx="10"
              fill={`url(#${podiumGradId})`}
              stroke="#8f5828"
              strokeWidth="1.8"
            />
            {/* Wood plank lines on podium */}
            <line x1="346" y1="100" x2="654" y2="100" stroke="rgba(91,55,25,0.22)" strokeWidth="1" />
            <line x1="346" y1="122" x2="654" y2="122" stroke="rgba(91,55,25,0.22)" strokeWidth="1" />

            {/* Left wing label on podium */}
            <rect x="352" y="106" width="52" height="17" rx="4" fill="rgba(15,23,42,0.24)" />
            <text
              x="378"
              y="117.5"
              textAnchor="middle"
              fontSize="7.5"
              fontWeight="900"
              fill="#fef3c7"
            >
              BỤC GIẢNG
            </text>

            {/* Wooden Lectern / Podium Table with Laptop & Chalk Box */}
            <rect
              x="412"
              y="82"
              width="176"
              height="24"
              rx="5"
              fill="#7c4a21"
              stroke="#522f13"
              strokeWidth="1.4"
            />
            {/* Open Lecture Book / Tablet */}
            <rect x="418" y="86" width="32" height="16" rx="2" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8" />
            <rect x="421" y="88.5" width="12" height="11" rx="1" fill="#ffffff" />
            <rect x="435" y="88.5" width="12" height="11" rx="1" fill="#ffffff" />
            <line x1="423" y1="91" x2="431" y2="91" stroke="#64748b" strokeWidth="0.8" />
            <line x1="423" y1="94" x2="430" y2="94" stroke="#94a3b8" strokeWidth="0.8" />

            {/* Lectern Nameplate */}
            <rect x="458" y="87" width="82" height="14" rx="3" fill="#1e293b" stroke="#f59e0b" strokeWidth="0.8" />
            <text x="499" y="96.3" textAnchor="middle" fontSize="6" fontWeight="800" fill="#fde68a">
              ThS. Phạm Văn Thuận
            </text>

            {/* Chalk Box ("Hộp phấn") on Podium Table */}
            <g transform="translate(547, 85)">
              <rect x="0" y="0" width="34" height="18" rx="3" fill="#0f766e" stroke="#115e59" strokeWidth="1" />
              <rect x="3" y="2.5" width="28" height="10" rx="1.5" fill="#134e4a" />
              {/* White & yellow chalk sticks inside box */}
              <rect x="5" y="4" width="3.5" height="7" rx="1" fill="#ffffff" />
              <rect x="10" y="4" width="3.5" height="7" rx="1" fill="#ffffff" />
              <rect x="15" y="4" width="3.5" height="7" rx="1" fill="#fde047" />
              <rect x="20" y="4" width="3.5" height="7" rx="1" fill="#ffffff" />
              <rect x="25" y="4" width="3.5" height="7" rx="1" fill="#f9a8d4" />
              <text x="17" y="16.5" textAnchor="middle" fontSize="5.2" fontWeight="900" fill="#ccfbf1">
                HỘP PHẤN
              </text>
            </g>

            {/* Front walkway boundary line */}
            <line
              x1="36"
              y1="158"
              x2="964"
              y2="158"
              className="stroke-slate-300/75 dark:stroke-slate-800"
              strokeWidth="1.2"
              strokeDasharray="5 5"
            />
          </g>

          {/* =============================================================== */}
          {/* 10x10 CLASSROOM SEATING GRID (MEMOIZED FOR 60FPS FLIGHT)        */}
          {/* =============================================================== */}
          <ClassroomDesksLayer
            desks={desks}
            students={normalizedStudents}
            activeCount={activeCount}
            reticleIndex={isThrowing && animState.phase === 'aiming' ? animState.reticleIndex : -1}
            highlightedIndex={activeHighlightedIndex}
            spotlightGradId={spotlightGradId}
            onHoverDesk={setHoveredDesk}
          />

          {/* =============================================================== */}
          {/* 2D TOP-DOWN TEACHER AVATAR ON PODIUM                            */}
          {/* =============================================================== */}
          <g transform={`translate(${TEACHER_POS.x}, ${TEACHER_POS.y}) rotate(${animState.teacherAngleDeg})`}>
            {/* Drop shadow */}
            <ellipse cx="1" cy="2" rx="14" ry="19" fill="rgba(15, 23, 42, 0.25)" />

            {/* Left resting arm */}
            <path
              d="M 1 -14 Q 10 -15 15 -11"
              fill="none"
              stroke="#1d4ed8"
              strokeWidth="5.2"
              strokeLinecap="round"
            />
            <circle cx="15.5" cy="-11" r="3" fill="#f7d1b1" />

            {/* Right throwing arm extending dynamically */}
            <path
              d={`M 2 13 Q ${(2 + animState.handExt) * 0.5} 14 ${animState.handExt} 11`}
              fill="none"
              stroke="#2563eb"
              strokeWidth="5.4"
              strokeLinecap="round"
            />
            <circle cx={animState.handExt} cy="11" r="3.3" fill="#f7d1b1" />

            {/* Shoulders & Lecturer Shirt */}
            <ellipse cx="0" cy="0" rx="8.5" ry="17" fill="#1e40af" stroke="#1e3a8a" strokeWidth="1.2" />
            {/* White collar & tie hint */}
            <path d="M 3 -5 L 8.5 0 L 3 5 Z" fill="#ffffff" />
            <line x1="5" y1="0" x2="9" y2="0" stroke="#0ea5e9" strokeWidth="1.8" strokeLinecap="round" />

            {/* Teacher Head */}
            <circle cx="3" cy="0" r="8.8" fill="#f7d1b1" stroke="rgba(15,23,42,0.22)" strokeWidth="0.8" />
            {/* Glasses frame peeking forward (+localX) */}
            <line x1="10.2" y1="-4.5" x2="10.2" y2="-1" stroke="#0f172a" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="10.2" y1="1" x2="10.2" y2="4.5" stroke="#0f172a" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="10.2" y1="-1" x2="10.2" y2="1" stroke="#0f172a" strokeWidth="0.9" />
            {/* Dark hair covering back/top of head (-localX) */}
            <path
              d="M 4.5 -8.7 A 8.8 8.8 0 1 0 4.5 8.7 Q -1 3 1.5 0 Q -1 -3 4.5 -8.7 Z"
              fill="#1e293b"
            />
          </g>

          {/* Glowing white chalk held in teacher's hand before throw release */}
          {showChalkInHand && (
            <g transform={`translate(${teacherHandWorld.x}, ${teacherHandWorld.y}) rotate(${animState.teacherAngleDeg - 25})`}>
              <circle cx="0" cy="0" r="9" fill={`url(#${chalkGlowGradId})`} opacity="0.7" />
              <rect
                x="-6"
                y="-2.1"
                width="12"
                height="4.2"
                rx="1.4"
                fill="#ffffff"
                stroke="#cbd5e1"
                strokeWidth="0.7"
              />
            </g>
          )}

          {/* =============================================================== */}
          {/* PHASE 1: AIMING LASER & TARGETING RETICLE                       */}
          {/* =============================================================== */}
          {isThrowing && animState.phase === 'aiming' && reticleDesk && (
            <g pointerEvents="none">
              <line
                x1={teacherHandWorld.x}
                y1={teacherHandWorld.y}
                x2={reticleDesk.x}
                y2={reticleDesk.y}
                stroke="#38bdf8"
                strokeWidth="1.8"
                strokeDasharray="6 6"
                opacity="0.75"
              />
              <g transform={`translate(${reticleDesk.x}, ${reticleDesk.y})`}>
                <circle cx="0" cy="-2" r="29" fill="none" stroke="#f43f5e" strokeWidth="2.2" opacity="0.9" />
                <circle cx="0" cy="-2" r="19" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 3" />
                {/* Reticle corner brackets */}
                <path
                  d="M -33 -14 L -33 -23 L -24 -23 M 24 -23 L 33 -23 L 33 -14 M -33 12 L -33 21 L -24 21 M 24 21 L 33 21 L 33 12"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
                {/* Crosshair ticks */}
                <line x1="-38" y1="-2" x2="-24" y2="-2" stroke="#f43f5e" strokeWidth="1.8" />
                <line x1="24" y1="-2" x2="38" y2="-2" stroke="#f43f5e" strokeWidth="1.8" />
              </g>
            </g>
          )}

          {/* =============================================================== */}
          {/* PHASE 2: PARABOLIC AIRBORNE CHALK + TRAIL + OFFSET SHADOW       */}
          {/* =============================================================== */}
          {isThrowing && animState.phase === 'flying' && animState.chalkArc && (
            <g pointerEvents="none">
              {/* Offset Ground Shadow */}
              <ellipse
                cx={animState.chalkArc.shadowX}
                cy={animState.chalkArc.shadowY}
                rx={10 * animState.chalkArc.shadowScale}
                ry={4.5 * animState.chalkArc.shadowScale}
                fill="rgba(15, 23, 42, 0.55)"
                opacity={animState.chalkArc.shadowOpacity}
              />

              {/* Tilted Chalk-Dust Trail Particles */}
              {animState.chalkArc.trail.map((pt) => (
                <g
                  key={pt.id}
                  transform={`translate(${pt.x}, ${pt.y}) rotate(${pt.tiltDeg}) scale(${pt.scale})`}
                  opacity={pt.opacity}
                >
                  <circle cx="0" cy="0" r="4.2" fill="#38bdf8" opacity="0.28" />
                  <rect
                    x="-5"
                    y="-1.7"
                    width="10"
                    height="3.4"
                    rx="1.7"
                    fill="#ffffff"
                    stroke="#0ea5e9"
                    strokeWidth="0.65"
                  />
                </g>
              ))}

              {/* Glowing Airborne White Chalk Cylinder */}
              <g
                transform={`translate(${animState.chalkArc.chalkX}, ${animState.chalkArc.chalkY}) scale(${animState.chalkArc.chalkScale})`}
              >
                <circle cx="0" cy="0" r="19" fill={`url(#${chalkGlowGradId})`} />
                <g transform={`rotate(${animState.chalkArc.chalkRotDeg})`}>
                  <rect
                    x="-9"
                    y="-3.3"
                    width="18"
                    height="6.6"
                    rx="2"
                    fill="#ffffff"
                    stroke="#0284c7"
                    strokeWidth="1.2"
                  />
                  <line x1="-5" y1="-1.2" x2="5" y2="-1.2" stroke="#cbd5e1" strokeWidth="1.1" />
                  <ellipse cx="7.5" cy="0" rx="1.6" ry="3" fill="#e2e8f0" />
                </g>
              </g>
            </g>
          )}

          {/* =============================================================== */}
          {/* PHASE 3: CHALK-DUST BURST & EXPANDING SHOCKWAVE RINGS           */}
          {/* =============================================================== */}
          {animState.impactPos && animState.impactProgress < 1 && (
            <g transform={`translate(${animState.impactPos.x}, ${animState.impactPos.y})`} pointerEvents="none">
              {/* Impact Flash */}
              {animState.impactProgress < 0.3 && (
                <circle
                  cx="0"
                  cy="0"
                  r={12 + animState.impactProgress * 75}
                  fill="#ffffff"
                  opacity={(1 - animState.impactProgress / 0.3) * 0.72}
                />
              )}

              {/* 3 Staggered Expanding Shockwave Rings */}
              {[0, 0.14, 0.28].map((delay, ringIdx) => {
                const localP = Math.max(0, Math.min(1, (animState.impactProgress - delay) / (1 - delay)));
                if (localP <= 0) return null;
                const eased = 1 - Math.pow(1 - localP, 2.2);
                const radius = 12 + eased * (64 + ringIdx * 10);
                const opacity = (1 - localP) * 0.88;
                const strokeColor = ringIdx === 0 ? '#fbbf24' : ringIdx === 1 ? '#ffffff' : '#38bdf8';
                return (
                  <circle
                    key={ringIdx}
                    cx="0"
                    cy="0"
                    r={radius}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={3.2 - ringIdx * 0.6}
                    opacity={opacity}
                  />
                );
              })}

              {/* Chalk-Dust Burst Particles */}
              {BURST_PARTICLES.map((p) => {
                const eased = 1 - Math.pow(1 - animState.impactProgress, 2.4);
                const px = Math.cos(p.angle) * p.speed * eased;
                const py = Math.sin(p.angle) * p.speed * eased + eased * eased * 5;
                const opacity = (1 - animState.impactProgress) * 0.95;

                if (p.isShard) {
                  return (
                    <rect
                      key={p.id}
                      x={px - 2.6}
                      y={py - 1.2}
                      width="5.2"
                      height="2.4"
                      rx="1"
                      fill={p.color}
                      opacity={opacity}
                      transform={`rotate(${p.rotOffset + animState.impactProgress * 220} ${px} ${py})`}
                    />
                  );
                }
                return (
                  <circle
                    key={p.id}
                    cx={px}
                    cy={py}
                    r={p.radius * (1 - animState.impactProgress * 0.45)}
                    fill={p.color}
                    opacity={opacity}
                  />
                );
              })}
            </g>
          )}

          {/* =============================================================== */}
          {/* PERSISTENT FLOATING "🎯 TRÚNG PHẤN!" CALLOUT BADGE ABOVE DESK   */}
          {/* =============================================================== */}
          {!isThrowing && pickedStudent && highlightedDesk && (
            <g
              transform={`translate(${Math.max(70, Math.min(930, highlightedDesk.x))}, ${highlightedDesk.y - 34})`}
              pointerEvents="none"
            >
              {/* Pointer caret down toward desk */}
              <polygon
                points="-6,9 6,9 0,16"
                fill="#f59e0b"
              />
              <rect
                x="-60"
                y="-13"
                width="120"
                height="23"
                rx="11.5"
                fill="#0f172a"
                stroke="#fbbf24"
                strokeWidth="2"
              />
              <text
                x="0"
                y="2"
                textAnchor="middle"
                fontSize="10"
                fontWeight="900"
                fill="#fde68a"
              >
                🎯 TRÚNG PHẤN!
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Persistent Winner Banner when (!isThrowing && pickedStudent) */}
      {!isThrowing && pickedStudent && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-emerald-500/10 border border-amber-400/50 flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>🎯 Trúng Phấn Gọi Tên</span>
                {highlightedDesk && (
                  <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-[10px]">
                    {`Ghế #${highlightedDesk.seatLabel}`}
                  </span>
                )}
              </div>
              <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5">
                {pickedStudent.fullName}{' '}
                <span className="font-mono text-xs sm:text-sm text-amber-700 dark:text-amber-300">
                  ({pickedStudent.studentCode})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2] text-[11px] font-extrabold border border-emerald-500/30">
              +0.25đ Phát biểu
            </span>
            <Award className="w-6 h-6 text-amber-500 shrink-0" />
          </div>
        </div>
      )}

      {/* Bottom Interactive Controls & Hover Inspector */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 min-h-[18px] flex items-center gap-1.5">
          <Crosshair className="w-3.5 h-3.5 text-teal-600 dark:text-[#00dfa2] shrink-0" />
          {hoveredDesk ? (
            hoveredDesk.empty ? (
              <span>{`Bàn trống • Ghế #${hoveredDesk.seatLabel} (${emptyCount} bàn dự phòng)`}</span>
            ) : (
              <span>
                <strong className="text-slate-800 dark:text-slate-100">{hoveredDesk.name}</strong>
                {` • MSSV: ${hoveredDesk.code} • Ghế #${hoveredDesk.seatLabel}`}
              </span>
            )
          ) : (
            <span>
              {`Lớp CNTT K26 (${activeCount}/${safeMaxSeats} bàn có sinh viên • Di chuột vào bàn để xem MSSV)`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={handleResetClick}
            disabled={isThrowing}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
            title="Đặt lại trạng thái gọi tên"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại</span>
          </button>

          <button
            type="button"
            onClick={() => onTriggerThrow?.()}
            disabled={isThrowing}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-60 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
          >
            <span>{isThrowing ? '💨 Đang ném phấn...' : '🎯 Ném Phấn Gọi Tên'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
