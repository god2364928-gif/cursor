export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  
  return '알 수 없는 오류가 발생했습니다'
}

export const logError = (context: string, error: unknown): void => {
  console.error(`[${context}]`, getErrorMessage(error))
  
  // 프로덕션 환경에서는 에러 로깅 서비스로 전송할 수 있습니다
  // if (process.env.NODE_ENV === 'production') {
  //   sendToErrorTrackingService(context, error)
  // }
}

