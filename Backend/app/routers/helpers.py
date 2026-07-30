from fastapi.responses import Response


def apply_result(result, response: Response):
    response.status_code = result.status_code
    return result.payload
