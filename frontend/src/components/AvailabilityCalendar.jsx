import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, MousePointer2 } from 'lucide-react';
import './AvailabilityCalendar.css';

const START_HOUR = 0;
const END_HOUR = 24;
const SLOT_MINUTES = 30;
const SLOTS_PER_HOUR = 60 / SLOT_MINUTES;
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * SLOTS_PER_HOUR; // 30 slots
const DAY_NAMES = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const PERU_OFFSET = -5; // UTC-5, no DST

/** Get Peru-time components from a Date */
export function toPeru(date) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const peru = new Date(utc + PERU_OFFSET * 3600000);
  return {
    year: peru.getFullYear(),
    month: peru.getMonth(),
    day: peru.getDate(),
    weekday: peru.getDay(),
    hour: peru.getHours(),
    minute: peru.getMinutes(),
  };
}

/** Create a UTC Date from Peru-time components */
export function fromPeru(year, month, day, hour = 0, minute = 0) {
  return new Date(Date.UTC(year, month, day, hour - PERU_OFFSET, minute));
}

export function getMonday(date) {
  const p = toPeru(date);
  const diff = p.weekday === 0 ? -6 : 1 - p.weekday;
  return fromPeru(p.year, p.month, p.day + diff, 0, 0);
}

// Slot index: 0 = START_HOUR:00, 1 = START_HOUR:30, 2 = (START_HOUR+1):00, ...
function slotToTime(slot) {
  const hour = START_HOUR + Math.floor(slot / SLOTS_PER_HOUR);
  const minute = (slot % SLOTS_PER_HOUR) * SLOT_MINUTES;
  return { hour, minute };
}

function timeToSlot(hour, minute) {
  return (hour - START_HOUR) * SLOTS_PER_HOUR + Math.floor(minute / SLOT_MINUTES);
}

function cellKey(day, slot) {
  return `${day}:${slot}`;
}

function parseCellKey(key) {
  const [d, s] = key.split(':').map(Number);
  return { day: d, slot: s };
}

/** Convert ISO windows to cell Set for a given week start (all in Peru time) */
function windowsToCells(windows, weekStart) {
  const cells = new Set();
  if (!windows || !windows.length) return cells;

  const weekEndMs = weekStart.getTime() + 7 * 24 * 3600000;
  const weekStartPeru = toPeru(weekStart);
  const weekStartDayMs = fromPeru(weekStartPeru.year, weekStartPeru.month, weekStartPeru.day).getTime();

  for (const w of windows) {
    const start = new Date(w.start_time);
    const end = new Date(w.end_time);
    if (end.getTime() <= weekStart.getTime() || start.getTime() >= weekEndMs) continue;

    const clampedStart = start < weekStart ? weekStart : start;
    const clampedEnd = end.getTime() > weekEndMs ? new Date(weekEndMs) : end;

    const ps = toPeru(clampedStart);
    const pe = toPeru(clampedEnd);

    const startDayMs = fromPeru(ps.year, ps.month, ps.day).getTime();
    const startDay = Math.round((startDayMs - weekStartDayMs) / (24 * 3600000));
    const endDayMs = fromPeru(pe.year, pe.month, pe.day).getTime();
    const endDay = Math.round((endDayMs - weekStartDayMs) / (24 * 3600000));

    for (let day = Math.max(startDay, 0); day <= Math.min(endDay, 6); day++) {
      const hStart = day === startDay ? ps.hour : 0;
      const mStart = day === startDay ? ps.minute : 0;
      const hEnd = day === endDay ? pe.hour : 24;
      const mEnd = day === endDay ? pe.minute : 0;

      if (hEnd === 0 && mEnd === 0 && day < endDay) continue;

      const slotStart = Math.max(timeToSlot(Math.max(hStart, START_HOUR), hStart >= START_HOUR ? mStart : 0), 0);
      const effectiveEndHour = (hEnd === 0 && mEnd === 0) ? END_HOUR : Math.min(hEnd, END_HOUR);
      const effectiveEndMin = (hEnd >= END_HOUR) ? 0 : mEnd;
      const slotEnd = Math.min(timeToSlot(effectiveEndHour, effectiveEndMin), TOTAL_SLOTS);

      for (let s = slotStart; s < slotEnd; s++) {
        cells.add(cellKey(day, s));
      }
    }
  }

  return cells;
}

/** Convert cell Set to ISO windows for a given week start (Peru time → UTC) */
function cellsToWindows(cells, weekStart) {
  if (cells.size === 0) return [];

  const wp = toPeru(weekStart);
  const dayMap = {};
  for (const key of cells) {
    const { day, slot } = parseCellKey(key);
    if (!dayMap[day]) dayMap[day] = [];
    dayMap[day].push(slot);
  }

  const windows = [];

  for (const [dayStr, slots] of Object.entries(dayMap)) {
    const day = Number(dayStr);
    slots.sort((a, b) => a - b);

    let blockStart = slots[0];
    let blockEnd = slots[0];

    for (let i = 1; i <= slots.length; i++) {
      if (i < slots.length && slots[i] === blockEnd + 1) {
        blockEnd = slots[i];
      } else {
        const st = slotToTime(blockStart);
        const et = slotToTime(blockEnd + 1);

        const startDate = fromPeru(wp.year, wp.month, wp.day + day, st.hour, st.minute);
        const endDate = fromPeru(wp.year, wp.month, wp.day + day, et.hour, et.minute);

        windows.push({
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
        });

        if (i < slots.length) {
          blockStart = slots[i];
          blockEnd = slots[i];
        }
      }
    }
  }

  return windows;
}

/** Find contiguous blocks for a day */
function findBlocks(cells, day) {
  const slots = [];
  for (const key of cells) {
    const parsed = parseCellKey(key);
    if (parsed.day === day) slots.push(parsed.slot);
  }
  slots.sort((a, b) => a - b);

  const blocks = [];
  if (slots.length === 0) return blocks;

  let start = slots[0];
  let end = slots[0];
  for (let i = 1; i <= slots.length; i++) {
    if (i < slots.length && slots[i] === end + 1) {
      end = slots[i];
    } else {
      blocks.push({ start, end });
      if (i < slots.length) {
        start = slots[i];
        end = slots[i];
      }
    }
  }
  return blocks;
}

function formatSlotTime(slot) {
  const { hour, minute } = slotToTime(slot);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export default function AvailabilityCalendar({
  myWindows = [],
  opponentWindows = [],
  busyWindows = [],
  myName = '',
  opponentName = '',
  onChange,
  onProposeTime,
  readOnly = false,
}) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [selectedCells, setSelectedCells] = useState(new Set());
  const dragRef = useRef({ active: false, paintMode: 'add', anchorDay: 0, anchorSlot: 0, currentDay: 0, currentSlot: 0 });
  const [dragState, setDragState] = useState(null);
  const gridRef = useRef(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [peruNow, setPeruNow] = useState(() => toPeru(new Date()));

  const opponentCells = useMemo(() => windowsToCells(opponentWindows, weekStart), [opponentWindows, weekStart]);
  const busyCells = useMemo(() => windowsToCells(busyWindows, weekStart), [busyWindows, weekStart]);

  // Map cell keys to their busy window label
  const busyLabelMap = useMemo(() => {
    const map = new Map();
    if (!busyWindows || !busyWindows.length) return map;
    const weekEndMs = weekStart.getTime() + 7 * 24 * 3600000;
    const weekStartPeru = toPeru(weekStart);
    const weekStartDayMs = fromPeru(weekStartPeru.year, weekStartPeru.month, weekStartPeru.day).getTime();
    for (const w of busyWindows) {
      const label = w.label || '';
      const start = new Date(w.start_time);
      const end = new Date(w.end_time);
      if (end.getTime() <= weekStart.getTime() || start.getTime() >= weekEndMs) continue;
      const clampedStart = start < weekStart ? weekStart : start;
      const clampedEnd = end.getTime() > weekEndMs ? new Date(weekEndMs) : end;
      const ps = toPeru(clampedStart);
      const pe = toPeru(clampedEnd);
      const startDayMs = fromPeru(ps.year, ps.month, ps.day).getTime();
      const startDay = Math.round((startDayMs - weekStartDayMs) / (24 * 3600000));
      const endDayMs = fromPeru(pe.year, pe.month, pe.day).getTime();
      const endDay = Math.round((endDayMs - weekStartDayMs) / (24 * 3600000));
      for (let day = Math.max(startDay, 0); day <= Math.min(endDay, 6); day++) {
        const hStart = day === startDay ? ps.hour : 0;
        const mStart = day === startDay ? ps.minute : 0;
        const hEnd = day === endDay ? pe.hour : 24;
        const mEnd = day === endDay ? pe.minute : 0;
        if (hEnd === 0 && mEnd === 0 && day < endDay) continue;
        const slotStart = Math.max(timeToSlot(Math.max(hStart, START_HOUR), hStart >= START_HOUR ? mStart : 0), 0);
        const effectiveEndHour = (hEnd === 0 && mEnd === 0) ? END_HOUR : Math.min(hEnd, END_HOUR);
        const effectiveEndMin = (hEnd >= END_HOUR) ? 0 : mEnd;
        const slotEnd = Math.min(timeToSlot(effectiveEndHour, effectiveEndMin), TOTAL_SLOTS);
        for (let s = slotStart; s < slotEnd; s++) {
          map.set(cellKey(day, s), label);
        }
      }
    }
    return map;
  }, [busyWindows, weekStart]);

  const myWindowsKey = useMemo(() => JSON.stringify(myWindows), [myWindows]);
  useEffect(() => {
    setSelectedCells(windowsToCells(myWindows, weekStart));
  }, [myWindowsKey, weekStart]);

  // Update Peru time every minute for current time indicator
  useEffect(() => {
    const interval = setInterval(() => setPeruNow(toPeru(new Date())), 60000);
    return () => clearInterval(interval);
  }, []);

  const weekDates = useMemo(() => {
    const wp = toPeru(weekStart);
    return Array.from({ length: 7 }, (_, i) => toPeru(fromPeru(wp.year, wp.month, wp.day + i)));
  }, [weekStart]);

  // Compute today's index in this week (-1 if not in this week)
  const todayIndex = useMemo(() => {
    for (let i = 0; i < weekDates.length; i++) {
      const d = weekDates[i];
      if (d.year === peruNow.year && d.month === peruNow.month && d.day === peruNow.day) return i;
    }
    return -1;
  }, [weekDates, peruNow]);

  const currentSlotIndex = useMemo(() => {
    if (todayIndex === -1) return -1;
    return timeToSlot(peruNow.hour, peruNow.minute);
  }, [todayIndex, peruNow]);

  const navigateWeek = (delta) => {
    setWeekStart(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + delta * 7);
      return next;
    });
  };

  const goToToday = () => {
    setWeekStart(getMonday(new Date()));
  };

  const getOtherWeekWindows = useCallback(() => {
    if (!myWindows || !myWindows.length) return [];
    const weekStartMs = weekStart.getTime();
    const weekEndMs = weekStartMs + 7 * 24 * 3600000;
    return myWindows.filter(w => {
      const end = new Date(w.end_time).getTime();
      const start = new Date(w.start_time).getTime();
      return end <= weekStartMs || start >= weekEndMs;
    });
  }, [myWindows, weekStart]);

  const emitChange = useCallback((cells) => {
    if (onChange) {
      const currentWeekWindows = cellsToWindows(cells, weekStart);
      const otherWeekWindows = getOtherWeekWindows();
      onChange([...otherWeekWindows, ...currentWeekWindows]);
    }
  }, [onChange, weekStart, getOtherWeekWindows]);

  // Check if a cell is in the past
  const isCellPast = useCallback((day, slot) => {
    if (todayIndex === -1) return false;
    if (day < todayIndex) return true;
    if (day === todayIndex && slot < currentSlotIndex) return true;
    return false;
  }, [todayIndex, currentSlotIndex]);

  // Drag logic
  const getDragRect = () => {
    const d = dragRef.current;
    if (!d.active) return null;
    return {
      minDay: Math.min(d.anchorDay, d.currentDay),
      maxDay: Math.max(d.anchorDay, d.currentDay),
      minSlot: Math.min(d.anchorSlot, d.currentSlot),
      maxSlot: Math.max(d.anchorSlot, d.currentSlot),
    };
  };

  const isCellInDragRect = (day, slot) => {
    const rect = getDragRect();
    if (!rect) return false;
    return day >= rect.minDay && day <= rect.maxDay && slot >= rect.minSlot && slot <= rect.maxSlot;
  };

  // Count cells in current drag rect
  const dragCellCount = useMemo(() => {
    if (!dragState) return 0;
    const rect = getDragRect();
    if (!rect) return 0;
    let count = 0;
    for (let d = rect.minDay; d <= rect.maxDay; d++) {
      for (let s = rect.minSlot; s <= rect.maxSlot; s++) {
        if (!isCellPast(d, s)) count++;
      }
    }
    return count;
  }, [dragState, busyCells, isCellPast]);

  const getCellFromPoint = (x, y) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const cell = el.closest('[data-day]');
    if (!cell) return null;
    return { day: Number(cell.dataset.day), slot: Number(cell.dataset.slot) };
  };

  const handlePointerDown = (day, slot, e) => {
    if (readOnly) return;
    if (isCellPast(day, slot)) return;
    e.preventDefault();
    const isSelected = selectedCells.has(cellKey(day, slot));
    dragRef.current = {
      active: true,
      paintMode: isSelected ? 'remove' : 'add',
      anchorDay: day, anchorSlot: slot,
      currentDay: day, currentSlot: slot,
    };
    setDragState({ day, slot });
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setCursorPos({ x: clientX, y: clientY });
  };

  const handlePointerMove = useCallback((e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setCursorPos({ x: clientX, y: clientY });
    if (!dragRef.current.active) return;
    const cell = getCellFromPoint(clientX, clientY);
    if (cell && (cell.day !== dragRef.current.currentDay || cell.slot !== dragRef.current.currentSlot)) {
      dragRef.current.currentDay = cell.day;
      dragRef.current.currentSlot = cell.slot;
      setDragState({ day: cell.day, slot: cell.slot });
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!dragRef.current.active) return;
    const rect = getDragRect();
    if (rect) {
      setSelectedCells(prev => {
        const next = new Set(prev);
        for (let d = rect.minDay; d <= rect.maxDay; d++) {
          for (let s = rect.minSlot; s <= rect.maxSlot; s++) {
            const key = cellKey(d, s);
            if (isCellPast(d, s)) continue;
            if (dragRef.current.paintMode === 'add') {
              next.add(key);
            } else {
              next.delete(key);
            }
          }
        }
        setTimeout(() => emitChange(next), 0);
        return next;
      });
    }
    dragRef.current.active = false;
    setDragState(null);
  }, [emitChange, busyCells, isCellPast]);

  useEffect(() => {
    document.addEventListener('mousemove', handlePointerMove);
    document.addEventListener('mouseup', handlePointerUp);
    document.addEventListener('touchmove', handlePointerMove, { passive: false });
    document.addEventListener('touchend', handlePointerUp);
    return () => {
      document.removeEventListener('mousemove', handlePointerMove);
      document.removeEventListener('mouseup', handlePointerUp);
      document.removeEventListener('touchmove', handlePointerMove);
      document.removeEventListener('touchend', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const handleOverlapClick = (day, slot) => {
    if (!onProposeTime) return;
    const wp = toPeru(weekStart);
    // Walk up to find start of contiguous overlap block
    let blockStart = slot;
    while (blockStart > 0 &&
      selectedCells.has(cellKey(day, blockStart - 1)) &&
      opponentCells.has(cellKey(day, blockStart - 1))) {
      blockStart--;
    }
    const st = slotToTime(blockStart);
    const proposedDate = fromPeru(wp.year, wp.month, wp.day + day, st.hour, st.minute);
    onProposeTime(proposedDate.toISOString());
  };

  const getCellClass = (day, slot) => {
    const key = cellKey(day, slot);
    const isMine = selectedCells.has(key);
    const isOpponent = opponentCells.has(key);
    const isBusy = busyCells.has(key);
    const inDrag = dragState && isCellInDragRect(day, slot);
    const busySuffix = isBusy ? ' avail-cell--busy' : '';

    if (inDrag && !isCellPast(day, slot)) {
      return (dragRef.current.paintMode === 'add' ? 'avail-cell--drag-add' : 'avail-cell--drag-remove') + busySuffix;
    }
    if (isMine && isOpponent) return 'avail-cell--overlap' + busySuffix;
    if (isMine) return 'avail-cell--mine' + busySuffix;
    if (isOpponent) return 'avail-cell--opponent' + busySuffix;
    if (isBusy) return 'avail-cell--busy';
    return '';
  };

  const blockEdges = useMemo(() => {
    const edges = {};
    const makeDurLabel = (block) => {
      const slotCount = block.end - block.start + 1;
      const totalMin = slotCount * SLOT_MINUTES;
      const hours = Math.floor(totalMin / 60);
      const mins = totalMin % 60;
      return hours > 0 && mins > 0 ? `${hours}h${mins}m` : hours > 0 ? `${hours}h` : `${mins}m`;
    };
    for (let d = 0; d < 7; d++) {
      // My blocks
      const blocks = findBlocks(selectedCells, d);
      for (const block of blocks) {
        const startLabel = formatSlotTime(block.start);
        const endLabel = formatSlotTime(block.end + 1);
        const nameTag = myName ? ` · ${myName}` : '';
        const blockLabel = `${startLabel}–${endLabel} (${makeDurLabel(block)})${nameTag}`;
        edges[cellKey(d, block.start)] = { ...(edges[cellKey(d, block.start)] || {}), isBlockStart: true, blockLabel };
        edges[cellKey(d, block.end)] = { ...(edges[cellKey(d, block.end)] || {}), isBlockEnd: true };
      }
      // Opponent blocks
      const oppBlocks = findBlocks(opponentCells, d);
      for (const block of oppBlocks) {
        const startLabel = formatSlotTime(block.start);
        const endLabel = formatSlotTime(block.end + 1);
        const nameTag = opponentName ? ` · ${opponentName}` : '';
        const oppBlockLabel = `${startLabel}–${endLabel} (${makeDurLabel(block)})${nameTag}`;
        edges[cellKey(d, block.start)] = { ...(edges[cellKey(d, block.start)] || {}), oppBlockLabel };
      }
      // Busy blocks
      const busyBlocks = findBlocks(busyCells, d);
      for (const block of busyBlocks) {
        const startLabel = formatSlotTime(block.start);
        const matchName = busyLabelMap.get(cellKey(d, block.start)) || '';
        const busyBlockLabel = matchName ? `${startLabel} ${matchName}` : `${startLabel} OCUPADO`;
        edges[cellKey(d, block.start)] = { ...(edges[cellKey(d, block.start)] || {}), busyBlockLabel };
      }
    }
    return edges;
  }, [selectedCells, opponentCells, busyCells, busyLabelMap, myName, opponentName]);

  const weekLabel = useMemo(() => {
    const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const ws = toPeru(weekStart);
    const we = toPeru(fromPeru(ws.year, ws.month, ws.day + 6));
    return `${ws.day} ${MONTHS[ws.month]} — ${we.day} ${MONTHS[we.month]}`;
  }, [weekStart]);

  // Selection stats
  const selectionStats = useMemo(() => {
    const myCount = selectedCells.size;
    let overlapCount = 0;
    for (const key of selectedCells) {
      if (opponentCells.has(key)) overlapCount++;
    }
    const myMinutes = myCount * SLOT_MINUTES;
    const myHours = Math.floor(myMinutes / 60);
    const myRemainder = myMinutes % 60;
    const overlapMinutes = overlapCount * SLOT_MINUTES;
    const overlapHours = Math.floor(overlapMinutes / 60);
    const overlapRemainder = overlapMinutes % 60;
    return { myCount, overlapCount, myHours, myRemainder, overlapHours, overlapRemainder };
  }, [selectedCells, opponentCells]);

  // Format drag count as hours + minutes
  const dragTimeLabel = useMemo(() => {
    if (dragCellCount === 0) return '';
    const minutes = dragCellCount * SLOT_MINUTES;
    const hours = Math.floor(minutes / 60);
    const rem = minutes % 60;
    if (hours > 0 && rem > 0) return `${dragCellCount} bloques (${hours}h ${rem}m)`;
    if (hours > 0) return `${dragCellCount} bloques (${hours}h)`;
    return `${dragCellCount} bloques (${rem}m)`;
  }, [dragCellCount]);

  // Build slot rows: each hour has SLOTS_PER_HOUR rows
  const slotRows = useMemo(() => {
    const rows = [];
    for (let s = 0; s < TOTAL_SLOTS; s++) {
      const { hour, minute } = slotToTime(s);
      rows.push({ slot: s, hour, minute, isHourStart: minute === 0 });
    }
    return rows;
  }, []);

  // Tooltip text for hovered cell
  const tooltipText = useMemo(() => {
    if (!hoveredCell || dragState) return '';
    const startTime = formatSlotTime(hoveredCell.slot);
    const endTime = formatSlotTime(hoveredCell.slot + 1);
    return `${startTime} – ${endTime}`;
  }, [hoveredCell, dragState]);

  // Current time line position (percentage through the day's slots)
  const currentTimeTop = useMemo(() => {
    if (todayIndex === -1 || currentSlotIndex < 0 || currentSlotIndex >= TOTAL_SLOTS) return null;
    // Each cell is 20px high, position = slot * 20 + fractional offset within the slot
    const minuteInSlot = peruNow.minute % SLOT_MINUTES;
    const fraction = minuteInSlot / SLOT_MINUTES;
    // +1 row for the header
    const pixelOffset = (currentSlotIndex + fraction) * 20;
    return pixelOffset;
  }, [todayIndex, currentSlotIndex, peruNow]);

  return (
    <div className={`avail-calendar ${dragState ? 'avail-calendar--dragging' : ''}`}>
      <div className="avail-week-nav">
        <button className="avail-week-nav-btn" onClick={() => navigateWeek(-1)} type="button">
          <ChevronLeft size={14} />
        </button>
        <button className="avail-week-nav-btn avail-week-nav-btn--today" onClick={goToToday} type="button">
          HOY
        </button>
        <span className="avail-week-label">{weekLabel}</span>
        <button className="avail-week-nav-btn" onClick={() => navigateWeek(1)} type="button">
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="avail-grid" ref={gridRef} style={{ position: 'relative' }}>
        {/* Header row */}
        <div className="avail-day-header avail-day-header-corner" />
        {weekDates.map((pd, i) => (
          <div key={i} className={`avail-day-header ${i === todayIndex ? 'avail-day-header--today' : ''}`}>
            {DAY_NAMES[i]} {pd.day}
          </div>
        ))}

        {/* Slot rows */}
        {slotRows.map(({ slot, hour, isHourStart }) => (
          <React.Fragment key={slot}>
            <div className={`avail-time-label ${isHourStart ? '' : 'avail-time-label--half'}`}>
              {isHourStart ? `${String(hour).padStart(2, '0')}:00` : ''}
            </div>
            {Array.from({ length: 7 }, (_, day) => {
              const key = cellKey(day, slot);
              const edge = blockEdges[key] || {};
              const isOverlap = selectedCells.has(key) && opponentCells.has(key);
              const isPast = isCellPast(day, slot);
              const isToday = day === todayIndex;
              return (
                <div
                  key={key}
                  className={`avail-cell ${isHourStart ? '' : 'avail-cell--half'} ${getCellClass(day, slot)} ${isOverlap ? 'avail-cell--clickable' : ''} ${edge.isBlockStart ? 'avail-cell--block-start' : ''} ${edge.isBlockEnd ? 'avail-cell--block-end' : ''} ${isPast ? 'avail-cell--past' : ''} ${isToday ? 'avail-cell--today' : ''}`}
                  data-day={day}
                  data-slot={slot}
                  onMouseDown={(e) => handlePointerDown(day, slot, e)}
                  onTouchStart={(e) => { e.preventDefault(); handlePointerDown(day, slot, e); }}
                  onClick={() => { if (isOverlap && onProposeTime) handleOverlapClick(day, slot); }}
                  onMouseEnter={() => setHoveredCell({ day, slot })}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  {edge.blockLabel && <span className="avail-block-label">{edge.blockLabel}</span>}
                  {edge.oppBlockLabel && <span className="avail-opp-label">{edge.oppBlockLabel}</span>}
                  {edge.busyBlockLabel && <span className="avail-busy-label">{edge.busyBlockLabel}</span>}
                </div>
              );
            })}
          </React.Fragment>
        ))}

        {/* Current time indicator line */}
        {todayIndex !== -1 && currentTimeTop !== null && (
          <div
            className="avail-time-indicator"
            style={{
              top: `calc(28px + ${currentTimeTop}px)`,
              // Position over today's column: skip time label column (44px), then offset by todayIndex columns
              left: `calc(44px + (100% - 44px) / 7 * ${todayIndex})`,
              width: `calc((100% - 44px) / 7)`,
            }}
          />
        )}
      </div>

      {/* Hover tooltip at cursor */}
      {tooltipText && hoveredCell && !dragState && (
        <div
          className="avail-tooltip"
          style={{
            position: 'fixed',
            left: cursorPos.x + 14,
            top: cursorPos.y - 28,
          }}
        >
          {tooltipText}
        </div>
      )}

      {/* Drag selection badge */}
      {dragState && dragCellCount > 0 && (
        <div
          className="avail-drag-badge"
          style={{
            position: 'fixed',
            left: cursorPos.x + 16,
            top: cursorPos.y - 12,
          }}
        >
          {dragTimeLabel}
        </div>
      )}

      <div className="avail-legend">
        <div className="avail-legend-item">
          <div className="avail-legend-swatch avail-legend-swatch--mine" />
          TÚ
        </div>
        <div className="avail-legend-item">
          <div className="avail-legend-swatch avail-legend-swatch--opponent" />
          OPONENTE
        </div>
        <div className="avail-legend-item">
          <div className="avail-legend-swatch avail-legend-swatch--overlap" />
          COINCIDENCIA
        </div>
        {busyWindows.length > 0 && (
          <div className="avail-legend-item">
            <div className="avail-legend-swatch avail-legend-swatch--busy" />
            OTRO MATCH
          </div>
        )}
      </div>

      {/* Selection stats bar */}
      {selectionStats.myCount > 0 ? (
        <div className="avail-stats-bar">
          <span className="avail-stats-item avail-stats-item--mine">
            {selectionStats.myCount} bloques • {selectionStats.myHours > 0 ? `${selectionStats.myHours}h ` : ''}{selectionStats.myRemainder > 0 ? `${selectionStats.myRemainder}m` : ''} seleccionadas
          </span>
          {selectionStats.overlapCount > 0 && (
            <span className="avail-stats-item avail-stats-item--overlap">
              {selectionStats.overlapHours > 0 ? `${selectionStats.overlapHours}h ` : ''}{selectionStats.overlapRemainder > 0 ? `${selectionStats.overlapRemainder}m` : ''} de coincidencia
            </span>
          )}
        </div>
      ) : !readOnly ? (
        <div className="avail-empty-state">
          <MousePointer2 size={16} />
          <span>Arrastra sobre el calendario para marcar tu disponibilidad</span>
        </div>
      ) : null}

      <AvailabilitySummary
        selectedCells={selectedCells}
        opponentCells={opponentCells}
        weekStart={weekStart}
        onProposeTime={onProposeTime}
      />
    </div>
  );
}

/** Text summary of availability blocks below the grid */
function AvailabilitySummary({ selectedCells, opponentCells, weekStart, onProposeTime }) {
  const DAY_NAMES_FULL = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  const wp = toPeru(weekStart);

  const cellsToBlocks = (cells) => {
    const dayMap = {};
    for (const key of cells) {
      const { day, slot } = parseCellKey(key);
      if (!dayMap[day]) dayMap[day] = [];
      dayMap[day].push(slot);
    }
    const blocks = [];
    for (const [dayStr, slots] of Object.entries(dayMap)) {
      const day = Number(dayStr);
      slots.sort((a, b) => a - b);
      let start = slots[0];
      let end = slots[0];
      for (let i = 1; i <= slots.length; i++) {
        if (i < slots.length && slots[i] === end + 1) {
          end = slots[i];
        } else {
          blocks.push({ day, startSlot: start, endSlot: end + 1 });
          if (i < slots.length) { start = slots[i]; end = slots[i]; }
        }
      }
    }
    blocks.sort((a, b) => a.day - b.day || a.startSlot - b.startSlot);
    return blocks;
  };

  const formatBlock = (b) => {
    const date = fromPeru(wp.year, wp.month, wp.day + b.day);
    const dp = toPeru(date);
    const dd = String(dp.day).padStart(2, '0');
    const mm = String(dp.month + 1).padStart(2, '0');
    const hStart = formatSlotTime(b.startSlot);
    const hEnd = formatSlotTime(b.endSlot);
    return { text: `${hStart} a ${hEnd} — ${DAY_NAMES_FULL[b.day]} ${dd}/${mm}`, day: b.day, startSlot: b.startSlot };
  };

  const overlapSet = useMemo(() => {
    const s = new Set();
    for (const key of selectedCells) {
      if (opponentCells.has(key)) s.add(key);
    }
    return s;
  }, [selectedCells, opponentCells]);

  const myBlocks = useMemo(() => cellsToBlocks(selectedCells).map(formatBlock), [selectedCells, weekStart]);
  const oppBlocks = useMemo(() => cellsToBlocks(opponentCells).map(formatBlock), [opponentCells, weekStart]);
  const overlapBlocks = useMemo(() => cellsToBlocks(overlapSet).map(formatBlock), [overlapSet, weekStart]);

  if (myBlocks.length === 0 && oppBlocks.length === 0) return null;

  return (
    <div className="avail-summary">
      {myBlocks.length > 0 && (
        <div className="avail-summary-group">
          <div className="avail-summary-label avail-summary-label--mine">Tu disponibilidad</div>
          {myBlocks.map((b, i) => (
            <div key={i} className="avail-summary-item avail-summary-item--mine">{b.text}</div>
          ))}
        </div>
      )}

      {oppBlocks.length > 0 && (
        <div className="avail-summary-group">
          <div className="avail-summary-label avail-summary-label--opponent">Oponente</div>
          {oppBlocks.map((b, i) => (
            <div key={i} className="avail-summary-item avail-summary-item--opponent">{b.text}</div>
          ))}
        </div>
      )}

      {overlapBlocks.length > 0 && (
        <div className="avail-summary-group">
          <div className="avail-summary-label avail-summary-label--overlap">Coincidencias</div>
          {overlapBlocks.map((b, i) => (
            <div
              key={i}
              className={`avail-summary-item avail-summary-item--overlap ${onProposeTime ? 'avail-summary-item--clickable' : ''}`}
              onClick={() => {
                if (!onProposeTime) return;
                const st = slotToTime(b.startSlot);
                const propDate = fromPeru(wp.year, wp.month, wp.day + b.day, st.hour, st.minute);
                onProposeTime(propDate.toISOString());
              }}
            >
              {b.text}
              {onProposeTime && <span className="avail-summary-propose-hint">→ Proponer</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
