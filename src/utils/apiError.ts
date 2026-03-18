class ApiError extends Error {
  message: string;
  statusCode: number;
  errors: unknown[];
  private success: boolean;

  constructor(
    statusCode: number,
    message: string = "Something went wrong",
    errors: unknown[],
    stack?: string, //stack-trace : where the error happens in your code
  ) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;
    this.success = false;

    // Fix prototype chain
    Object.setPrototypeOf(this, ApiError.prototype);

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
