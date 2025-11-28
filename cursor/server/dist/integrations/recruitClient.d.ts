export type RecruitAPIType = 'gourmet' | 'beauty' | 'hotel' | 'golf';
export interface RecruitSearchParams {
    apiType: RecruitAPIType;
    keyword?: string;
    large_area?: string;
    middle_area?: string;
    lat?: number;
    lng?: number;
    range?: 1 | 2 | 3 | 4 | 5;
    count?: number;
    start?: number;
}
export interface RecruitPlace {
    id: string;
    name: string;
    tel?: string;
    address: string;
    lat?: number;
    lng?: number;
    genre?: string;
    category?: string;
    budget?: string;
    catch?: string;
    urls?: {
        pc?: string;
    };
    photo?: {
        pc?: {
            l?: string;
            m?: string;
            s?: string;
        };
    };
    open?: string;
    close?: string;
    parking?: string;
    capacity?: number;
    card?: string;
    raw?: any;
}
export interface RecruitSearchResult {
    results: {
        api_version?: string;
        results_available: number;
        results_returned: number;
        results_start: number;
        data?: RecruitPlace[];
    };
}
/**
 * 통합 검색 함수
 */
export declare function searchRecruit(params: RecruitSearchParams): Promise<RecruitSearchResult>;
/**
 * 지역 코드 (모든 API 공통)
 */
export declare const AREA_CODES: {
    readonly TOKYO: "Z011";
    readonly OSAKA: "Z014";
    readonly KYOTO: "Z015";
    readonly KOBE: "Z016";
    readonly NAGOYA: "Z012";
    readonly FUKUOKA: "Z092";
    readonly SAPPORO: "Z001";
    readonly SENDAI: "Z041";
    readonly HIROSHIMA: "Z081";
    readonly YOKOHAMA: "Z021";
};
/**
 * API별 카테고리 목록
 */
export declare const CATEGORIES: {
    readonly gourmet: readonly [];
    readonly beauty: readonly [{
        readonly code: "hair";
        readonly name: "ヘアサロン";
        readonly name_ko: "헤어 살롱";
    }, {
        readonly code: "nail";
        readonly name: "ネイル";
        readonly name_ko: "네일";
    }, {
        readonly code: "eyelash";
        readonly name: "まつげ";
        readonly name_ko: "속눈썹";
    }, {
        readonly code: "esthe";
        readonly name: "エステ";
        readonly name_ko: "에스테틱";
    }, {
        readonly code: "relaxation";
        readonly name: "リラクゼーション";
        readonly name_ko: "릴랙세이션";
    }];
    readonly hotel: readonly [{
        readonly code: "hotel";
        readonly name: "ホテル";
        readonly name_ko: "호텔";
    }, {
        readonly code: "ryokan";
        readonly name: "旅館";
        readonly name_ko: "료칸";
    }, {
        readonly code: "onsen";
        readonly name: "温泉";
        readonly name_ko: "온천";
    }];
    readonly golf: readonly [];
};
/**
 * 데이터베이스 저장용 포맷
 */
export declare function formatPlaceForDB(place: RecruitPlace, apiType: RecruitAPIType, searchKeyword?: string, searchArea?: string): {
    recruit_id: string;
    api_type: RecruitAPIType;
    name: string;
    tel: string | null;
    address: string;
    latitude: number | null;
    longitude: number | null;
    genre: string | null;
    category: string | null;
    budget_average: string | null;
    catch_phrase: string | null;
    shop_url: string | null;
    image_url: string | null;
    business_hours: string | null;
    holiday: string | null;
    parking: string | null;
    capacity: number | null;
    card_accepted: string | null;
    search_keyword: string | null;
    search_area: string | null;
};
/**
 * API 활성화 상태 확인
 */
export declare function getAvailableAPIs(): RecruitAPIType[];
/**
 * 특정 API 사용 가능 여부 확인
 */
export declare function isAPIAvailable(apiType: RecruitAPIType): boolean;
//# sourceMappingURL=recruitClient.d.ts.map