"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminOnly = void 0;
/**
 * Admin 권한 체크 미들웨어
 * Admin 권한이 없는 사용자의 요청을 거부합니다.
 */
const adminOnly = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin 권한이 필요합니다' });
    }
    next();
};
exports.adminOnly = adminOnly;
//# sourceMappingURL=adminOnly.js.map