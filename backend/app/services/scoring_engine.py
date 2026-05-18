from datetime import datetime
from app.models.models import UoMTypeEnum

def calculate_score(uom_type, target, actual, completion_date):
    if uom_type == UoMTypeEnum.NUMERIC_MIN:
        if actual is None or target == 0: return 0
        return round((actual / target) * 100, 2)

    if uom_type == UoMTypeEnum.NUMERIC_MAX:
        if actual is None or actual == 0: return 0
        return round((target / actual) * 100, 2)

    if uom_type == UoMTypeEnum.PERCENTAGE:
        if actual is None or target == 0: return 0
        pct = (actual / target) * 100
        return round(min(pct, 100), 2)

    if uom_type == UoMTypeEnum.TIMELINE:
        if not completion_date: return 0

        def parse_naive(val):
            if isinstance(val, datetime):
                return val.replace(tzinfo=None)
            s = str(val)
            s = s.replace("Z", "+00:00")
            try:
                dt = datetime.fromisoformat(s)
                return dt.replace(tzinfo=None)
            except Exception:
                try:
                    ts = float(s)
                    return datetime.fromtimestamp(ts / 1000.0 if ts > 1e12 else ts, tz=None)
                except Exception:
                    return None

        completed = parse_naive(completion_date)
        if completed is None: return 0

        if isinstance(target, str):
            deadline = parse_naive(target)
        else:
            ts = float(target)
            deadline = datetime.fromtimestamp(ts / 1000.0, tz=None) if ts > 1e12 else datetime.fromtimestamp(ts, tz=None)

        if deadline is None: return 0

        if completed <= deadline: return 100.0
        days_late = (completed - deadline).days
        return max(0.0, round(100 - days_late * 5, 2))

    if uom_type == UoMTypeEnum.ZERO:
        if actual is None: return 0
        return 100.0 if actual == 0 else 0.0

    return 0