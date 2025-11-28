export interface HotpepperSearchParams {
    keyword?: string;
    large_area?: string;
    middle_area?: string;
    lat?: number;
    lng?: number;
    range?: 1 | 2 | 3 | 4 | 5;
    count?: number;
    start?: number;
}
export interface HotpepperRestaurant {
    id: string;
    name: string;
    name_kana?: string;
    tel?: string;
    address: string;
    lat?: number;
    lng?: number;
    genre?: {
        name: string;
        catch: string;
    };
    budget?: {
        average?: string;
        name?: string;
        code?: string;
    };
    catch: string;
    urls?: {
        pc?: string;
    };
    photo?: {
        pc?: {
            l?: string;
            m?: string;
            s?: string;
        };
        mobile?: {
            l?: string;
            s?: string;
        };
    };
    open?: string;
    close?: string;
    parking?: string;
    capacity?: number;
    card?: string;
    non_smoking?: string;
    station_name?: string;
    private_room?: string;
    coupon_urls?: {
        pc?: string;
        sp?: string;
    };
}
export interface HotpepperSearchResult {
    results: {
        api_version: string;
        results_available: number;
        results_returned: number;
        results_start: number;
        shop?: HotpepperRestaurant[];
    };
}
/**
 * HotPepper API で店舗を検索
 */
export declare function searchRestaurants(params: HotpepperSearchParams): Promise<HotpepperSearchResult>;
/**
 * 主要エリアコード (参考用)
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
 * 検索結果をデータベース用にフォーマット
 */
export declare function formatRestaurantForDB(shop: HotpepperRestaurant, searchKeyword?: string, searchArea?: string): {
    hotpepper_id: string;
    name: string;
    tel: string | null;
    address: string;
    budget_average: string | null;
    catch_phrase: string | null;
    shop_url: string | null;
    search_keyword: string | null;
    search_area: string | null;
};
//# sourceMappingURL=hotpepperClient.d.ts.map