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
  "slots": [{"day":"monday","period":1,"startTime":"08:00","endTime":"08:40"}]
}

Output: { "assignments": [...], "status": "optimal"|"feasible"|"infeasible" }
"""
import json
import sys

try:
    from ortools.sat.python import cp_model
except ImportError:
    print(json.dumps({"error": "ortools not installed", "assignments": []}))
    sys.exit(1)


def main():
    raw = sys.stdin.read()
    data = json.loads(raw or "{}")
    teachers = data.get("teachers") or []
    classes = data.get("classes") or []
    lessons = data.get("lessons") or []
    slots = [s for s in (data.get("slots") or []) if not s.get("isBreak")]

    if not lessons or not slots:
        print(json.dumps({"assignments": [], "status": "infeasible"}))
        return

    model = cp_model.CpModel()
    assignment_vars = {}

    for li, lesson in enumerate(lessons):
        for si, slot in enumerate(slots):
            key = (li, si)
            assignment_vars[key] = model.NewBoolVar(f"a_{li}_{si}")

    # Each lesson assigned to exactly periodsPerWeek slots
    for li, lesson in enumerate(lessons):
        need = int(lesson.get("periodsPerWeek") or 1)
        model.Add(sum(assignment_vars[(li, si)] for si in range(len(slots))) == need)

    # One lesson per class per slot
    for si in range(len(slots)):
        for ci, cls in enumerate(classes):
            class_lessons = [
                li
                for li, lesson in enumerate(lessons)
                if lesson.get("classId") == cls.get("id")
            ]
            if class_lessons:
                model.Add(
                    sum(assignment_vars[(li, si)] for li in class_lessons) <= 1
                )

    # One lesson per teacher per slot
    for si in range(len(slots)):
        for teacher in teachers:
            tid = teacher.get("id")
            t_lessons = [
                li
                for li, lesson in enumerate(lessons)
                if lesson.get("teacherId") == tid
            ]
            if t_lessons:
                model.Add(
                    sum(assignment_vars[(li, si)] for li in t_lessons) <= 1
                )

    # Teacher workload (weekly max)
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

    model.Maximize(
        sum(assignment_vars.values())
    )

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
