from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple


@dataclass(frozen=True)
class Slot:
    id: str
    day_of_week: str
    period: int
    is_break: bool = False


@dataclass(frozen=True)
class RecipeBlock:
    id: str
    block_type: str
    size: int
    quantity: int
    placement_priority: int = 5
    preferred_days: Tuple[str, ...] = ()
    preferred_periods: Tuple[int, ...] = ()
    forbidden_days: Tuple[str, ...] = ()
    forbidden_periods: Tuple[int, ...] = ()
    allow_split_across_breaks: bool = False
    is_locked: bool = False


@dataclass(frozen=True)
class RecipeConstraint:
    id: str
    constraint_type: str
    priority: int
    config: Dict[str, Any]


def sort_blocks_by_difficulty(blocks: Sequence[RecipeBlock]) -> List[RecipeBlock]:
    def key(b: RecipeBlock) -> Tuple[int, int, int, int]:
        pref_strength = (1 if b.preferred_days else 0) + (1 if b.preferred_periods else 0)
        forbid_strength = (1 if b.forbidden_days else 0) + (1 if b.forbidden_periods else 0)
        return (-b.size, -pref_strength, -forbid_strength, b.placement_priority)

    return sorted(list(blocks), key=key)


def find_consecutive_slots(
    slots: Sequence[Slot],
    size: int,
    *,
    allow_split_across_breaks: bool = False,
    preferred_days: Optional[Iterable[str]] = None,
    preferred_periods: Optional[Iterable[int]] = None,
    forbidden_days: Optional[Iterable[str]] = None,
    forbidden_periods: Optional[Iterable[int]] = None,
) -> List[List[Slot]]:
    if size <= 0:
        return []
    if size == 1:
        allowed = []
        for s in slots:
            if s.is_break:
                continue
            if forbidden_days and s.day_of_week in set(forbidden_days):
                continue
            if forbidden_periods and s.period in set(forbidden_periods):
                continue
            allowed.append([s])
        return _rank_sequences(
            allowed, preferred_days=preferred_days, preferred_periods=preferred_periods
        )

    by_day: Dict[str, List[Slot]] = {}
    for s in slots:
        by_day.setdefault(s.day_of_week, []).append(s)

    sequences: List[List[Slot]] = []
    for day, day_slots in by_day.items():
        day_slots_sorted = sorted(day_slots, key=lambda x: x.period)
        usable = [s for s in day_slots_sorted if not s.is_break]
        usable_by_period = {s.period: s for s in usable}

        periods = sorted(usable_by_period.keys())
        for start_period in periods:
            seq: List[Slot] = []
            ok = True
            for p in range(start_period, start_period + size):
                s = usable_by_period.get(p)
                if not s:
                    ok = False
                    break
                if forbidden_days and s.day_of_week in set(forbidden_days):
                    ok = False
                    break
                if forbidden_periods and s.period in set(forbidden_periods):
                    ok = False
                    break
                seq.append(s)

            if not ok:
                continue

            if not allow_split_across_breaks:
                if _sequence_crosses_break(day_slots_sorted, seq):
                    continue

            sequences.append(seq)

    return _rank_sequences(
        sequences, preferred_days=preferred_days, preferred_periods=preferred_periods
    )


def validate_recipe_placement(
    *,
    blocks: Sequence[RecipeBlock],
    constraints: Sequence[RecipeConstraint],
    slots: Sequence[Slot],
    expected_periods_per_week: Optional[int] = None,
) -> Tuple[bool, Dict[str, Any]]:
    errors: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []

    if expected_periods_per_week is not None and expected_periods_per_week < 0:
        errors.append(
            {
                "code": "EXPECTED_NEGATIVE",
                "message": "Expected periods per week cannot be negative.",
            }
        )

    total_periods = 0
    for b in blocks:
        if b.size <= 0:
            errors.append(
                {
                    "code": "BLOCK_SIZE_INVALID",
                    "message": f"Block {b.id} has invalid size {b.size}.",
                    "blockId": b.id,
                }
            )
            continue
        if b.quantity <= 0:
            errors.append(
                {
                    "code": "BLOCK_QUANTITY_INVALID",
                    "message": f"Block {b.id} has invalid quantity {b.quantity}.",
                    "blockId": b.id,
                }
            )
            continue
        total_periods += b.size * b.quantity

    if expected_periods_per_week is not None and total_periods != expected_periods_per_week:
        errors.append(
            {
                "code": "TOTAL_PERIODS_MISMATCH",
                "message": f"Sum of blocks = {total_periods} (expected {expected_periods_per_week}).",
                "expected": expected_periods_per_week,
                "actual": total_periods,
                "suggestion": "Adjust block quantities/sizes so total matches expected periods.",
            }
        )

    non_break_slots = [s for s in slots if not s.is_break]
    if not non_break_slots:
        errors.append(
            {
                "code": "NO_SLOTS",
                "message": "No teaching time slots are configured.",
                "suggestion": "Seed or configure TimeSlot records first.",
            }
        )
        return False, {"errors": errors, "warnings": warnings, "totalPeriods": total_periods}

    for b in blocks:
        if b.size <= 1:
            continue
        sequences = find_consecutive_slots(
            slots,
            b.size,
            allow_split_across_breaks=b.allow_split_across_breaks,
            preferred_days=b.preferred_days,
            preferred_periods=b.preferred_periods,
            forbidden_days=b.forbidden_days,
            forbidden_periods=b.forbidden_periods,
        )
        if len(sequences) < b.quantity:
            errors.append(
                {
                    "code": "INSUFFICIENT_CONSECUTIVE_SLOTS",
                    "message": f"Block {b.id} requires {b.quantity} consecutive sequences of length {b.size}, but only {len(sequences)} exist.",
                    "blockId": b.id,
                    "suggestion": "Reduce block quantity/size or adjust time slot configuration.",
                }
            )

    hard_constraints = [c for c in constraints if c.constraint_type.upper() == "HARD"]
    soft_constraints = [c for c in constraints if c.constraint_type.upper() == "SOFT"]
    if len(hard_constraints) > 50:
        warnings.append(
            {
                "code": "MANY_HARD_CONSTRAINTS",
                "message": f"{len(hard_constraints)} hard constraints may make solving slow.",
                "suggestion": "Prefer soft constraints where possible.",
            }
        )
    if len(soft_constraints) > 200:
        warnings.append(
            {
                "code": "MANY_SOFT_CONSTRAINTS",
                "message": f"{len(soft_constraints)} soft constraints may make scoring slow.",
                "suggestion": "Disable low-priority soft constraints during peak usage.",
            }
        )

    is_valid = len(errors) == 0
    return is_valid, {"errors": errors, "warnings": warnings, "totalPeriods": total_periods}


def handle_solver_failure(
    *,
    attempt: int,
    max_attempts: int,
    blocks: Sequence[RecipeBlock],
    constraints: Sequence[RecipeConstraint],
    last_error: str,
) -> Dict[str, Any]:
    soft = [c for c in constraints if c.constraint_type.upper() == "SOFT"]
    hard = [c for c in constraints if c.constraint_type.upper() == "HARD"]

    if attempt >= max_attempts:
        return {
            "action": "fail",
            "message": "Solver failed after maximum retries.",
            "details": last_error,
        }

    if soft:
        relaxed = [c for c in constraints if c.constraint_type.upper() != "SOFT"]
        return {
            "action": "retry",
            "message": "Retrying with soft constraints disabled.",
            "next": {"constraints": [c.__dict__ for c in relaxed], "blocks": [b.__dict__ for b in blocks]},
        }

    if hard and any(b.size >= 3 for b in blocks):
        simplified = []
        for b in blocks:
            if b.size >= 3:
                simplified.append(
                    RecipeBlock(
                        id=b.id,
                        block_type=b.block_type,
                        size=2,
                        quantity=b.quantity + 1,
                        placement_priority=b.placement_priority,
                        preferred_days=b.preferred_days,
                        preferred_periods=b.preferred_periods,
                        forbidden_days=b.forbidden_days,
                        forbidden_periods=b.forbidden_periods,
                        allow_split_across_breaks=b.allow_split_across_breaks,
                        is_locked=b.is_locked,
                    )
                )
            else:
                simplified.append(b)
        return {
            "action": "retry",
            "message": "Retrying with simplified block sizes.",
            "next": {"constraints": [c.__dict__ for c in constraints], "blocks": [b.__dict__ for b in simplified]},
        }

    return {
        "action": "retry",
        "message": "Retrying with randomized placement order.",
        "next": {"constraints": [c.__dict__ for c in constraints], "blocks": [b.__dict__ for b in reversed(list(blocks))]},
    }


def _sequence_crosses_break(day_slots_sorted: Sequence[Slot], seq: Sequence[Slot]) -> bool:
    if not seq:
        return False
    start = min(s.period for s in seq)
    end = max(s.period for s in seq)
    for s in day_slots_sorted:
        if s.is_break and start <= s.period <= end:
            return True
    return False


def _rank_sequences(
    sequences: List[List[Slot]],
    *,
    preferred_days: Optional[Iterable[str]] = None,
    preferred_periods: Optional[Iterable[int]] = None,
) -> List[List[Slot]]:
    pref_days = set(preferred_days or [])
    pref_periods = set(preferred_periods or [])

    def score(seq: List[Slot]) -> Tuple[int, int]:
        if not seq:
            return (0, 0)
        day_score = 1 if seq[0].day_of_week in pref_days else 0
        period_score = 0
        if pref_periods:
            period_score = 1 if seq[0].period in pref_periods else 0
        return (day_score, period_score)

    return sorted(sequences, key=score, reverse=True)

