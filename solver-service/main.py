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


class AtomicGroupIn(BaseModel):
    lessonIds: List[str]
    allowedDays: Optional[List[str]] = None
    preferMorning: bool = False


class RecipeBlockPayloadIn(BaseModel):
    size: int
    count: int
    mustBeAtomic: bool = True
    preferMorning: bool = False
    allowedDays: Optional[List[str]] = None


class RecipePayloadIn(BaseModel):
    recipeId: str
    teachingAssignmentId: str
    blocks: List[RecipeBlockPayloadIn] = Field(default_factory=list)
    constraints: List[Dict[str, Any]] = Field(default_factory=list)


class SolveRequest(BaseModel):
    teachers: List[TeacherIn]
    rooms: List[RoomIn] = Field(default_factory=list)
    classes: List[ClassIn] = Field(default_factory=list)
    slots: List[SlotIn]
    lessons: List[LessonIn]
    constraints: List[ConstraintIn] = Field(default_factory=list)
    lockedAssignments: List[LockedAssignmentIn] = Field(default_factory=list)
    atomicGroups: List[AtomicGroupIn] = Field(default_factory=list)
    recipes: List[RecipePayloadIn] = Field(default_factory=list)
    breakAfterPeriods: List[int] = Field(default_factory=lambda: [2, 5])

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
    next_slot_by_id: Dict[str, Optional[str]] = {}
    slot_by_id: Dict[str, SlotIn] = idx["slot_by_id"]
    by_day_period: Dict[Tuple[str, int], str] = {}
    for s in usable_slots:
        by_day_period[(str(s.dayOfWeek), int(s.period))] = s.id
    for s in usable_slots:
        next_slot_by_id[s.id] = by_day_period.get((str(s.dayOfWeek), int(s.period) + 1))

    domains: Dict[str, List[str]] = {l.id: list(slot_ids) for l in req.lessons}

    def _normalize_day(day: str) -> str:
        return str(day or "").strip().lower()

    break_after = sorted(set(int(p) for p in (req.breakAfterPeriods or [2, 5])))

    def _run_respects_breaks(start_period: int, span: int) -> bool:
        for break_after_p in break_after:
            if start_period <= break_after_p and start_period + span - 1 > break_after_p:
                return False
        return True

    def _allowed_starts_for_group(size: int, allowed_days: Optional[List[str]], prefer_morning: bool) -> List[List[str]]:
        allowed_day_set = set(_normalize_day(d) for d in (allowed_days or []) if str(d).strip())
        runs: List[List[str]] = []
        for s in usable_slots:
            day = _normalize_day(s.dayOfWeek)
            if allowed_day_set and day not in allowed_day_set:
                continue
            if prefer_morning and int(s.period) > 4:
                continue
            start_period = int(s.period)
            if not _run_respects_breaks(start_period, size):
                continue
            run = [s.id]
            cur = s.id
            ok = True
            for _ in range(size - 1):
                nxt = next_slot_by_id.get(cur)
                if not nxt:
                    ok = False
                    break
                run.append(nxt)
                cur = nxt
            if ok:
                runs.append(run)
        return runs

    for g in req.atomicGroups:
        lesson_ids = list(dict.fromkeys([str(x) for x in g.lessonIds if str(x).strip()]))
        if len(lesson_ids) < 2:
            continue
        for lid in lesson_ids:
            if lid not in domains:
                raise HTTPException(status_code=422, detail=f"Atomic group references unknown lessonId: {lid}")

        runs = _allowed_starts_for_group(len(lesson_ids), g.allowedDays, bool(g.preferMorning))
        if not runs:
            raise HTTPException(status_code=422, detail="No feasible consecutive runs for an atomic group.")

        for i, lid in enumerate(lesson_ids):
            allowed_here = sorted({r[i] for r in runs})
            current = set(domains[lid])
            domains[lid] = [s for s in allowed_here if s in current]
            if not domains[lid]:
                raise HTTPException(status_code=422, detail="Atomic group domain became empty.")

    prob = Problem()
    for lesson in req.lessons:
        prob.addVariable(lesson.id, domains.get(lesson.id, slot_ids))

    def _adjacent(a: str, b: str) -> bool:
        return next_slot_by_id.get(a) == b

    for g in req.atomicGroups:
        lesson_ids = list(dict.fromkeys([str(x) for x in g.lessonIds if str(x).strip()]))
        if len(lesson_ids) < 2:
            continue
        for i in range(len(lesson_ids) - 1):
            prob.addConstraint(_adjacent, (lesson_ids[i], lesson_ids[i + 1]))

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
