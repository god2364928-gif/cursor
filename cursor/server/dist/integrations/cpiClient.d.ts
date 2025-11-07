type CpiRecord = {
    record_id: number;
    username: string;
    company: string | null;
    phone_number: string | null;
    created_at: string;
    is_out: number;
    is_contract: number;
};
export interface FetchParams {
    startDate: string;
    endDate: string;
    page?: number;
    row?: number;
}
export declare function fetchFirstOutCalls(params: FetchParams): Promise<{
    data: CpiRecord[];
    total: number;
}>;
export {};
//# sourceMappingURL=cpiClient.d.ts.map