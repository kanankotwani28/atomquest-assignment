from datetime import datetime
from app.models.models import UoMTypeEnum

# def calculate_score(uom_type: UoMTypeEnum, target: float,
#                     actual: float | None, completion_date: datetime | None) -> float | None:
#     if uom_type == UoMTypeEnum.NUMERIC_MIN:
#         if actual is None or target == 0: return None
#         return round((actual / target) * 100, 2)

#     if uom_type == UoMTypeEnum.NUMERIC_MAX:
#         if actual is None or actual == 0: return None
#         return round((target / actual) * 100, 2)

#     if uom_type == UoMTypeEnum.TIMELINE:
#         if not completion_date: return None
#         deadline = (datetime.fromtimestamp(target / 1000) if target > 1e9 else datetime.fromtimestamp(target))
#         if completion_date <= deadline: return 100.0
#         days_late = (completion_date - deadline).days
#         return max(0.0, round(100 - days_late * 5, 2))

#     if uom_type == UoMTypeEnum.ZERO:
#         if actual is None: return None
#         return 100.0 if actual == 0 else 0.0

#     return None

from datetime import datetime
from app.models.models import UoMTypeEnum

def calculate_score(uom_type, target, actual, completion_date):

    if uom_type == UoMTypeEnum.NUMERIC_MIN:
        if actual is None or target == 0: return None
        return round((actual / target) * 100, 2)   

    if uom_type == UoMTypeEnum.NUMERIC_MAX:
        if actual is None or actual == 0: return None
        return round((target / actual) * 100, 2)   

    if uom_type == UoMTypeEnum.TIMELINE:
        if not completion_date: return None
        # Accept either ISO string, seconds timestamp, or milliseconds timestamp
        if isinstance(target, str):
            try:
                deadline = datetime.fromisoformat(target)
            except Exception:
                try:
                    deadline = datetime.fromtimestamp(float(target))
                except Exception:
                    return None
        else:
            ts = float(target)
            # heuristics: if ts looks like milliseconds (greater than 1e12), divide
            if ts > 1e12:
                deadline = datetime.fromtimestamp(ts / 1000.0)
            else:
                deadline = datetime.fromtimestamp(ts)
        if completion_date <= deadline: return 100.0
        days_late = (completion_date - deadline).days
        return max(0.0, round(100 - days_late * 5, 2))

    if uom_type == UoMTypeEnum.ZERO:
        if actual is None: return None
        return 100.0 if actual == 0 else 0.0

    return None