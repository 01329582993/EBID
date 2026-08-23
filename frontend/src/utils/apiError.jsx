export function parseApiError(error) {
  const data = error?.response?.data;
  const httpStatus = error?.response?.status;

  if (!data) {
    return {
      status: httpStatus || 0,
      title: 'Network Error',
      message: 'Could not reach the server. Check your connection and try again.',
      fieldErrors: null,
      timestamp: null,
    };
  }

  if (data.details && typeof data.details === 'object') {
    return {
      status: data.status ?? httpStatus,
      title: data.error || 'Validation Failed',
      message: 'Please correct the highlighted fields.',
      fieldErrors: data.details,
      timestamp: data.timestamp || null,
    };
  }

  if (data.timestamp && data.status && data.error) {
    return {
      status: data.status,
      title: 'Server Error',
      message: data.error,
      fieldErrors: null,
      timestamp: data.timestamp,
    };
  }

  if (data.error) {
    return {
      status: httpStatus || 400,
      title: 'Request Failed',
      message: data.error,
      fieldErrors: null,
      timestamp: null,
    };
  }

  return {
    status: httpStatus || 500,
    title: 'Unknown Error',
    message: 'Something went wrong. Please try again.',
    fieldErrors: null,
    timestamp: null,
  };
}

export function getErrorMessage(error) {
  return parseApiError(error).message;
}