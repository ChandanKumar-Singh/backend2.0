/**
 * Standard API response formatter
 */
export class ApiResponse {
  constructor(success, message, data = null, meta = null) {
    this.success = success;
    this.message = message;
    this.timestamp = new Date().toISOString();
    this.meta = meta;
    this.data = data;
  }

  static success(message = 'Success', data = null, meta = null) {
    return new ApiResponse(true, message, data, meta);
  }

  static error(message = 'Error', data = null, meta = null) {
    return new ApiResponse(false, message, data, meta);
  }

  static created(message = 'Resource created successfully', data = null) {
    return new ApiResponse(true, message, data);
  }

  static updated(message = 'Resource updated successfully', data = null) {
    return new ApiResponse(true, message, data);
  }

  static deleted(message = 'Resource deleted successfully') {
    return new ApiResponse(true, message);
  }

  static paginated(message = 'Success', data = [], pagination = {}) {
    return new ApiResponse(true, message, data, { pagination });
  }
}

/**
 * Response helper methods
 */
export const sendResponse = (res, statusCode, response) => {
  return res.status(statusCode).json(response);
};

export const sendSuccess = (res, message, data = null, meta = null) => {
  return sendResponse(res, 200, ApiResponse.success(message, data, meta));
};

export const sendCreated = (res, message, data = null) => {
  return sendResponse(res, 201, ApiResponse.created(message, data));
};

export const sendError = (res, statusCode, message, data = null) => {
  return sendResponse(res, statusCode, ApiResponse.error(message, data));
};

export const sendPaginated = (res, message, data, pagination) => {
  return sendResponse(res, 200, ApiResponse.paginated(message, data, pagination));
};

export const sendBadRequest = (res, message = 'Bad Request', errors = null) => {
  return sendError(res, 400, message, errors);
};

export const sendUnauthorized = (res, message = 'Unauthorized') => {
  return sendError(res, 401, message);
};

export const sendForbidden = (res, message = 'Forbidden') => {
  return sendError(res, 403, message);
};

export const sendNotFound = (res, message = 'Resource not found') => {
  return sendError(res, 404, message);
};

export const sendConflict = (res, message = 'Resource already exists') => {
  return sendError(res, 409, message);
};

export const sendServerError = (res, message = 'Internal Server Error') => {
  return sendError(res, 500, message);
};
