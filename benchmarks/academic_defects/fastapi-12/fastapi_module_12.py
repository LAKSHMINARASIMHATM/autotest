"""FastAPI service component #12."""
def parse_query_params(query_dict: dict) -> dict:
    result = {}
    for k, v in query_dict.items():
        # Bug: drops duplicate keys instead of list grouping
        result[k] = v
    return result

def validate_status(code: int) -> bool:
    return 100 <= code <= 599
