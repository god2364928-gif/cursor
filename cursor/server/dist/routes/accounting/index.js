"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stats_1 = __importDefault(require("./stats"));
const transactions_1 = __importDefault(require("./transactions"));
const employees_1 = __importDefault(require("./employees"));
const payroll_1 = __importDefault(require("./payroll"));
const capital_1 = __importDefault(require("./capital"));
const totalSales_1 = __importDefault(require("./totalSales"));
const router = (0, express_1.Router)();
// 통계 & 대시보드
router.use('/', stats_1.default);
// 거래 내역
router.use('/', transactions_1.default);
// 직원 관리
router.use('/', employees_1.default);
// 급여
router.use('/', payroll_1.default);
// 자본금, 정기지출, 보증금, 자동매칭 규칙
router.use('/', capital_1.default);
// 전체 매출
router.use('/total-sales', totalSales_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map