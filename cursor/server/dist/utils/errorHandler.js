"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.handleError = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const handleError = (error, res) => {
    if (error instanceof AppError && error.isOperational) {
        return res.status(error.statusCode).json({
            status: 'error',
            message: error.message
        });
    }
    // 예상치 못한 에러의 경우 로그 출력
    console.error('Unexpected error:', error);
    return res.status(500).json({
        status: 'error',
        message: 'Internal server error'
    });
};
exports.handleError = handleError;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((error) => {
            (0, exports.handleError)(error, res);
        });
    };
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=errorHandler.js.map