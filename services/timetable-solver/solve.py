#!/usr/bin/env python3
"""
ZSMS timetable solver — Google OR-Tools CP-SAT (Phase 3 P3.3).
Run: pip install -r requirements.txt && python solve.py < input.json

Input JSON:
{
  "teachers": [{"id":"t1","maxPeriods":25}],
  "classes": [{"id":"c1"}],
  "subjects": [{"id":"s1"}],
  "lessons": [{"id":"l1","teacherId":"t1","classId":"c1","subjectId":"s1","periodsPerWeek":3}],
  "slots": [{"day":"monday","period":1,"startTime":"08:00","endTime":"08:40"}],
  "sessionRules": {"minGapPeriods": 1, "enforceSubjectSplit": true, "enforceReturnGap": true}
}

Session rules (keep in sync with lib/timetable/teacherClassSessionRules.ts):
  Rule A — same teacher+class+subject periods on one day must form one contiguous block.
  Rule B — different subjects for same teacher+class need minGapPeriods free periods between.
"""
import json
import sys
from collections import defaultdict

try:
    from ortools.sat.python import cp_model
except ImportError:
    print(json.dumps({"error": "ortools not installed", "assignments": []}))
    sys.exit(1)


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
                assignments.append(
                    {
                        "lessonId": lesson.get("id"),
                        "teacherId": lesson.get("teacherId"),
                        "classId": lesson.get("classId"),
                        "subjectId": lesson.get("subjectId"),
                        "dayOfWeek": slot.get("day"),
                        "period": slot.get("period"),
                        "startTime": slot.get("startTime"),
                        "endTime": slot.get("endTime"),
                    }
                )
        out_status = "optimal" if status == cp_model.OPTIMAL else "feasible"
    else:
        out_status = "infeasible"

    print(json.dumps({"assignments": assignments, "status": out_status}))


if __name__ == "__main__":
    main()
