import { Response } from 'express';
export declare class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string, statusCode?: number);
}
export declare const handleError: (error: Error | AppError, res: Response) => Response<any, Record<string, any>>;
export declare const asyncHandler: (fn: Function) => (req: any, res: Response, next: any) => void;
//# sourceMappingURL=errorHandler.d.ts.map