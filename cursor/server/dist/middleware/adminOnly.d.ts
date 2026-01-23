import { Response } from 'express';
import { AuthRequest } from './auth';
/**
 * Admin 권한 체크 미들웨어
 * Admin 권한이 없는 사용자의 요청을 거부합니다.
 */
export declare const adminOnly: (req: AuthRequest, res: Response, next: Function) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=adminOnly.d.ts.map