import { Response } from 'express'

export class AppError extends Error {
  statusCode: number
  isOperational: boolean

  constructor(message: string, statusCode: number = 500) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}

export const handleError = (error: Error | AppError, res: Response) => {
  if (error instanceof AppError && error.isOperational) {
    return res.status(error.statusCode).json({
      status: 'error',
      message: error.message
    })
  }

  // 예상치 못한 에러의 경우 로그 출력
  console.error('Unexpected error:', error)
  
  return res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  })
}

export const asyncHandler = (fn: Function) => {
  return (req: any, res: Response, next: any) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      handleError(error, res)
    })
  }
}

