#!/usr/bin/env python3
"""
ZSMS timetable solver — Google OR-Tools CP-SAT (Phase 3 P3.3).
Run: pip install -r requirements.txt && python solve.py < input.json

Input JSON:
{
  "teachers": [{"id":"t1","maxPeriods":25}],
  "classes": [{"id":"c1"}],
  "subjects": [{"id":"s1"}],
  "lessons": [{"id":"l1","teacherId":"t1","classId":"c1","subjectId":"s1","periodsPerWeek":3,"roomId":"lab1"}],
  "slots": [{"day":"monday","period":1,"startTime":"08:00","endTime":"08:40"}],
  "sessionRules": {
    "minGapPeriods": 1,
    "enforceSubjectSplit": true,
    "enforceReturnGap": true,
    "maxPeriodsPerDay": 6,
    "maxConsecutivePeriods": 4,
    "enforceDayLimit": true,
    "enforceConsecutiveLimit": true
  }
}

Session rules (keep in sync with lib/timetable/teacherClassSessionRules.ts):
  Rule A — same teacher+class+subject periods on one day must form one contiguous block.
  Rule B — different subjects for same teacher+class need minGapPeriods free periods between.

Room/venue (keep in sync with lib/timetable/timeRangeOverlap.ts roomSlotsOverlap):
  Lessons with the same non-empty roomId/classroomId cannot share a slot.
"""
import json
import sys
from collections import defaultdict

try:
    from ortools.sat.python import cp_model
except ImportError:
    print(json.dumps({"error": "ortools not installed", "assignments": []}))
    sys.exit(1)


def lesson_room_id(lesson):
    return str(lesson.get("roomId") or lesson.get("classroomId") or "").strip()


def apply_session_rules(model, assignment_vars, lessons, slots, session_rules):
    """Port of teacherClassSessionRules — keep in sync with TypeScript detect/placement."""
    if not session_rules:
        return

    min_gap = int(session_rules.get("minGapPeriods") or 1)
    if min_gap < 0:
        min_gap = 0
    enforce_split = session_rules.get("enforceSubjectSplit", True)
    enforce_return = session_rules.get("enforceReturnGap", True)

    slots_by_day = defaultdict(list)
    for si, slot in enumerate(slots):
        day = str(slot.get("day") or "").strip().lower()
        period = int(slot.get("period") or 0)
        if day and period >= 1:
            slots_by_day[day].append((si, period))
    for day in slots_by_day:
        slots_by_day[day].sort(key=lambda x: x[1])

    # Rule A: for each lesson, periods on a day must be contiguous (no holes)
    if enforce_split:
        for li, _lesson in enumerate(lessons):
            for _day, day_slots in slots_by_day.items():
                n = len(day_slots)
                for i in range(n):
                    for k in range(i + 2, n):
                        si_i, _ = day_slots[i]
                        si_k, _ = day_slots[k]
                        middles = [assignment_vars[(li, day_slots[m][0])] for m in range(i + 1, k)]
                        for mid in middles:
                            model.Add(
                                assignment_vars[(li, si_i)] + assignment_vars[(li, si_k)]
                                <= 1 + mid
                            )

    # Rule B: different subjects, same teacher+class, gap < minGap forbidden
    if enforce_return:
        by_tc = defaultdict(list)
        for li, lesson in enumerate(lessons):
            tid = str(lesson.get("teacherId") or "")
            cid = str(lesson.get("classId") or "")
            if tid and cid:
                by_tc[(tid, cid)].append(li)

        for (_tid, _cid), lesson_idxs in by_tc.items():
            if len(lesson_idxs) < 2:
                continue
            for _day, day_slots in slots_by_day.items():
                for ia, li_a in enumerate(lesson_idxs):
                    for li_b in lesson_idxs[ia + 1 :]:
                        sub_a = str(lessons[li_a].get("subjectId") or "")
                        sub_b = str(lessons[li_b].get("subjectId") or "")
                        if sub_a == sub_b:
                            continue
                        for i, (si_a, p_a) in enumerate(day_slots):
                            for j, (si_b, p_b) in enumerate(day_slots):
                                if i == j or p_a >= p_b:
                                    continue
                                gap = p_b - p_a - 1
                                if gap >= min_gap:
                                    continue
                                model.Add(
                                    assignment_vars[(li_a, si_a)]
                                    + assignment_vars[(li_b, si_b)]
                                    <= 1
                                )


def apply_room_constraints(model, assignment_vars, lessons, slots):
    """≤1 lesson per room per slot — mirrors TimetableAllocationEntry_no_room_overlap."""
    by_room = defaultdict(list)
    for li, lesson in enumerate(lessons):
        rid = lesson_room_id(lesson)
        if rid:
            by_room[rid].append(li)

    for _rid, lesson_idxs in by_room.items():
        if len(lesson_idxs) < 2:
            continue
        for si in range(len(slots)):
            model.Add(sum(assignment_vars[(li, si)] for li in lesson_idxs) <= 1)


def _parse_hhmm_minutes(value):
    text = str(value or "").strip()
    parts = text.split(":")
    if len(parts) < 2:
        return None
    try:
        return int(parts[0]) * 60 + int(parts[1])
    except ValueError:
        return None


def slots_are_wall_clock_contiguous(slot_a, slot_b, max_gap_minutes=5):
    """True when slot_b starts within max_gap of slot_a end (same twin as TS consecutive)."""
    end_a = _parse_hhmm_minutes(slot_a.get("endTime"))
    start_b = _parse_hhmm_minutes(slot_b.get("startTime"))
    if end_a is None or start_b is None:
        return False
    return start_b <= end_a + max_gap_minutes


def apply_workload_rules(model, assignment_vars, lessons, slots, session_rules):
    """
    Teacher workload limits — keep in sync with lib/timetable/teacherWorkloadRules.ts.
      - maxPeriodsPerDay per teacher per day
      - maxConsecutivePeriods contiguous run (wall-clock adjacency; breaks reset runs)
    Break/lunch overlap is enforced by excluding break slots from the teachable set.
    """
    if not session_rules:
        return

    max_day = int(session_rules.get("maxPeriodsPerDay") or 6)
    if max_day < 1:
        max_day = 6
    max_consec = int(session_rules.get("maxConsecutivePeriods") or 4)
    if max_consec < 1:
        max_consec = 4
    enforce_day = session_rules.get("enforceDayLimit", True)
    enforce_consec = session_rules.get("enforceConsecutiveLimit", True)

    slots_by_day = defaultdict(list)
    for si, slot in enumerate(slots):
        day = str(slot.get("day") or "").strip().lower()
        period = int(slot.get("period") or 0)
        if day and period >= 1:
            slots_by_day[day].append((si, period, slot))
    for day in slots_by_day:
        slots_by_day[day].sort(key=lambda x: x[1])

    lessons_by_teacher = defaultdict(list)
    for li, lesson in enumerate(lessons):
        tid = str(lesson.get("teacherId") or "")
        if tid:
            lessons_by_teacher[tid].append(li)

    for _tid, lesson_idxs in lessons_by_teacher.items():
        if not lesson_idxs:
            continue
        for _day, day_slots in slots_by_day.items():
            day_vars = [
                assignment_vars[(li, si)] for li in lesson_idxs for si, _p, _s in day_slots
            ]
            if enforce_day and day_vars:
                model.Add(sum(day_vars) <= max_day)

            if not enforce_consec or len(day_slots) <= max_consec:
                continue

            # Build contiguous runs (wall-clock); forbid any window of length max_consec+1
            n = len(day_slots)
            i = 0
            while i < n:
                run = [day_slots[i]]
                j = i + 1
                while j < n and slots_are_wall_clock_contiguous(
                    day_slots[j - 1][2], day_slots[j][2]
                ):
                    run.append(day_slots[j])
                    j += 1
                if len(run) > max_consec:
                    for start in range(0, len(run) - max_consec):
                        window = run[start : start + max_consec + 1]
                        model.Add(
                            sum(
                                assignment_vars[(li, si)]
                                for li in lesson_idxs
                                for si, _p, _s in window
                            )
                            <= max_consec
                        )
                i = j


def main():
    raw = sys.stdin.read()
    data = json.loads(raw or "{}")
    teachers = data.get("teachers") or []
    classes = data.get("classes") or []
    lessons = data.get("lessons") or []
    slots = [s for s in (data.get("slots") or []) if not s.get("isBreak")]
    session_rules = data.get("sessionRules") or {}

    if not lessons or not slots:
        print(json.dumps({"assignments": [], "status": "infeasible"}))
        return

    model = cp_model.CpModel()
    assignment_vars = {}

    for li, lesson in enumerate(lessons):
        for si, slot in enumerate(slots):
            key = (li, si)
            assignment_vars[key] = model.NewBoolVar(f"a_{li}_{si}")

    for li, lesson in enumerate(lessons):
        need = int(lesson.get("periodsPerWeek") or 1)
        model.Add(sum(assignment_vars[(li, si)] for si in range(len(slots))) == need)

    for si in range(len(slots)):
        for _ci, cls in enumerate(classes):
            class_lessons = [
                li
                for li, lesson in enumerate(lessons)
                if lesson.get("classId") == cls.get("id")
            ]
            if class_lessons:
                model.Add(sum(assignment_vars[(li, si)] for li in class_lessons) <= 1)

    for si in range(len(slots)):
        for teacher in teachers:
            tid = teacher.get("id")
            t_lessons = [
                li for li, lesson in enumerate(lessons) if lesson.get("teacherId") == tid
            ]
            if t_lessons:
                model.Add(sum(assignment_vars[(li, si)] for li in t_lessons) <= 1)

    teacher_max = {t["id"]: int(t.get("maxPeriods") or 25) for t in teachers}
    for tid, max_p in teacher_max.items():
        t_lessons = [
            li for li, lesson in enumerate(lessons) if lesson.get("teacherId") == tid
        ]
        if t_lessons:
            model.Add(
                sum(
                    assignment_vars[(li, si)]
                    for li in t_lessons
                    for si in range(len(slots))
                )
                <= max_p
            )

    apply_session_rules(model, assignment_vars, lessons, slots, session_rules)
    apply_room_constraints(model, assignment_vars, lessons, slots)
    apply_workload_rules(model, assignment_vars, lessons, slots, session_rules)

    model.Maximize(sum(assignment_vars.values()))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = float(data.get("timeoutSec") or 30)
    status = solver.Solve(model)

    assignments = []
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for (li, si), var in assignment_vars.items():
            if solver.Value(var):
                lesson = lessons[li]
                slot = slots[si]
                row = {
                    "lessonId": lesson.get("id"),
                    "teacherId": lesson.get("teacherId"),
                    "classId": lesson.get("classId"),
                    "subjectId": lesson.get("subjectId"),
                    "dayOfWeek": slot.get("day"),
                    "period": slot.get("period"),
                    "startTime": slot.get("startTime"),
                    "endTime": slot.get("endTime"),
                }
                rid = lesson_room_id(lesson)
                if rid:
                    row["roomId"] = rid
                    row["classroomId"] = rid
                assignments.append(row)
        out_status = "optimal" if status == cp_model.OPTIMAL else "feasible"
    else:
        out_status = "infeasible"

    print(json.dumps({"assignments": assignments, "status": out_status}))


if __name__ == "__main__":
    main()
