from __future__ import annotations

import time
from typing import Any, Dict, List, Literal, Optional, Tuple

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from constraint import AllDifferentConstraint, Problem


ConstraintType = Literal["HARD", "SOFT"]
ConstraintScope = Literal["TEACHER", "CLASS", "ROOM", "SCHOOL"]


class TeacherIn(BaseModel):
    id: str
    name: str = ""
    maxHoursPerWeek: int = 25
    subjectIds: List[str] = Field(default_factory=list)


class RoomIn(BaseModel):
    id: str
    name: str = ""


class ClassIn(BaseModel):
    id: str
    name: str = ""


class SlotIn(BaseModel):
    id: str
    dayOfWeek: str
    period: int
    startTime: str
    endTime: str
    isBreak: bool = False


class LessonIn(BaseModel):
    id: str
    teacherId: str
    classId: str
    subjectId: str
    roomId: Optional[str] = None


class ConstraintIn(BaseModel):
    id: str
    type: ConstraintType
    scope: ConstraintScope
    targetId: Optional[str] = None
    priority: int = 5
    config: Dict[str, Any] = Field(default_factory=dict)


class LockedAssignmentIn(BaseModel):
    teacherId: str
    slotId: str


class SolveRequest(BaseModel):
    teachers: List[TeacherIn]
    rooms: List[RoomIn] = Field(default_factory=list)
    classes: List[ClassIn] = Field(default_factory=list)
    slots: List[SlotIn]
    lessons: List[LessonIn]
    constraints: List[ConstraintIn] = Field(default_factory=list)
    lockedAssignments: List[LockedAssignmentIn] = Field(default_factory=list)

    maxSolutions: int = 500
    timeoutMs: int = 15_000


class SolveResponse(BaseModel):
    assignments: Dict[str, str]
    optimizationScore: int
    stats: Dict[str, Any]


app = FastAPI(title="ZSMS Solver Service", version="0.1.0")


def _minutes(hhmm: str) -> int:
    try:
        h, m = str(hhmm).split(":")
        return int(h) * 60 + int(m)
    except Exception:
        return 0


def _build_indexes(req: SolveRequest) -> Dict[str, Any]:
    teacher_by_id = {t.id: t for t in req.teachers}
    slot_by_id = {s.id: s for s in req.slots}
    lessons_by_teacher: Dict[str, List[LessonIn]] = {}
    lessons_by_class: Dict[str, List[LessonIn]] = {}
    lessons_by_room: Dict[str, List[LessonIn]] = {}

    for l in req.lessons:
        lessons_by_teacher.setdefault(l.teacherId, []).append(l)
        lessons_by_class.setdefault(l.classId, []).append(l)
        if l.roomId:
            lessons_by_room.setdefault(l.roomId, []).append(l)

    return {
        "teacher_by_id": teacher_by_id,
        "slot_by_id": slot_by_id,
        "lessons_by_teacher": lessons_by_teacher,
        "lessons_by_class": lessons_by_class,
        "lessons_by_room": lessons_by_room,
    }


def _score_solution(
    req: SolveRequest, idx: Dict[str, Any], sol: Dict[str, str]
) -> Tuple[int, Dict[str, Any]]:
    teacher_by_id: Dict[str, TeacherIn] = idx["teacher_by_id"]
    slot_by_id: Dict[str, SlotIn] = idx["slot_by_id"]

    by_teacher_day: Dict[str, Dict[str, List[int]]] = {}
    teacher_minutes: Dict[str, int] = {}

    for lesson in req.lessons:
        slot_id = sol.get(lesson.id)
        if not slot_id:
            continue
        slot = slot_by_id.get(slot_id)
        if not slot:
            continue
        by_teacher_day.setdefault(lesson.teacherId, {}).setdefault(slot.dayOfWeek, []).append(slot.period)
        duration = max(0, _minutes(slot.endTime) - _minutes(slot.startTime))
        teacher_minutes[lesson.teacherId] = teacher_minutes.get(lesson.teacherId, 0) + duration

    penalty = 0.0
    overload_count = 0
    gap_penalty = 0.0
    edge_free_penalty = 0.0

    for teacher_id, days in by_teacher_day.items():
        t = teacher_by_id.get(teacher_id)
        max_hours = float(t.maxHoursPerWeek if t else 25)
        hours = float(teacher_minutes.get(teacher_id, 0)) / 60.0
        if hours > max_hours:
            overload_count += 1
            penalty += (hours - max_hours) * 8.0

        for _, periods in days.items():
            ps = sorted(set(periods))
            if not ps:
                continue
            first = ps[0]
            last = ps[-1]
            if first > 1:
                edge_free_penalty += 1.0
            max_period = max((s.period for s in req.slots if not s.isBreak), default=last)
            if last < max_period:
                edge_free_penalty += 1.0
            gaps = 0
            for i in range(1, len(ps)):
                gaps += max(0, ps[i] - ps[i - 1] - 1)
            gap_penalty += float(gaps) * 1.5

    penalty += gap_penalty + edge_free_penalty

    score = int(round(max(0.0, min(100.0, 100.0 - penalty))))
    stats = {
        "penalty": penalty,
        "overloadedTeachers": overload_count,
        "gapPenalty": gap_penalty,
        "edgeFreePenalty": edge_free_penalty,
    }
    return score, stats


def _solve(req: SolveRequest) -> SolveResponse:
    if not req.lessons:
        return SolveResponse(assignments={}, optimizationScore=0, stats={"reason": "no_lessons"})

    usable_slots = [s for s in req.slots if not s.isBreak]
    if not usable_slots:
        raise HTTPException(status_code=400, detail="No usable slots provided (all are breaks).")

    idx = _build_indexes(req)
    slot_ids = [s.id for s in usable_slots]

    prob = Problem()
    for lesson in req.lessons:
        prob.addVariable(lesson.id, slot_ids)

    for _, group in idx["lessons_by_teacher"].items():
        if len(group) > 1:
            prob.addConstraint(AllDifferentConstraint(), [l.id for l in group])
    for _, group in idx["lessons_by_class"].items():
        if len(group) > 1:
            prob.addConstraint(AllDifferentConstraint(), [l.id for l in group])
    for _, group in idx["lessons_by_room"].items():
        if len(group) > 1:
            prob.addConstraint(AllDifferentConstraint(), [l.id for l in group])

    for locked in req.lockedAssignments:
        teacher_id = locked.teacherId
        slot_id = locked.slotId
        group = idx["lessons_by_teacher"].get(teacher_id) or []
        if not group:
            raise HTTPException(
                status_code=422,
                detail=f"Locked assignment references teacher with no lessons: {teacher_id}",
            )
        if slot_id not in slot_ids:
            raise HTTPException(
                status_code=422,
                detail=f"Locked assignment references unknown/unusable slot: {slot_id}",
            )

        lesson_ids = [l.id for l in group]

        def _must_use_slot(*vals: str, target: str = slot_id) -> bool:
            return target in vals

        prob.addConstraint(_must_use_slot, lesson_ids)

    start = time.time()
    best_sol: Optional[Dict[str, str]] = None
    best_score = -1
    best_stats: Dict[str, Any] = {}

    it = prob.getSolutionIter()
    checked = 0
    for sol in it:
        checked += 1
        score, stats = _score_solution(req, idx, sol)
        if score > best_score:
            best_score = score
            best_sol = sol
            best_stats = stats
            if best_score >= 100:
                break

        elapsed_ms = int((time.time() - start) * 1000)
        if checked >= req.maxSolutions or elapsed_ms >= req.timeoutMs:
            break

    if not best_sol:
        raise HTTPException(status_code=422, detail="No feasible solution found for given constraints.")

    return SolveResponse(
        assignments={str(k): str(v) for k, v in best_sol.items()},
        optimizationScore=int(best_score),
        stats={
            "checkedSolutions": checked,
            "timeMs": int((time.time() - start) * 1000),
            **best_stats,
        },
    )


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/solve", response_model=SolveResponse)
def solve(req: SolveRequest) -> SolveResponse:
    return _solve(req)
