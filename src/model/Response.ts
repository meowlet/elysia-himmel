interface SuccessResponse<T> {
  status: "success";
  message: string;
  data: T;
}

interface ErrorResponse {
  status: "error";
  message: string;
  error: {
    code: string;
    details: string;
  };
}

function createSuccessResponse<T>(
  message: string,
  data: T
): SuccessResponse<T> {
  return {
    status: "success",
    message,
    data,
  };
}

function createErrorResponse(
  message: string,
  code: string,
  details: string
): ErrorResponse {
  return {
    status: "error",
    message,
    error: {
      code,
      details: details || message,
    },
  };
}

export { createSuccessResponse, createErrorResponse };
