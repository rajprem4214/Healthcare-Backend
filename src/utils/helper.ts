import { Request } from "express"

export function extractPaginationParams(req: Request) {
    const MAX_LIMIT = 30
    const MIN_PAGE = 1
    const DEFAULT_PAGE = 1
    const DEFAULT_LIMIT = 10
    const query = req.query ?? {}
    const page = Math.max(parseInt(String(query.page ?? DEFAULT_PAGE)), MIN_PAGE)
    const limit = Math.min(parseInt(String(query.limit ?? DEFAULT_LIMIT)), MAX_LIMIT)
    return {
        // Starts from 1
        page: page,
        limit: limit,
        // The actual offset position calculated relative to pagination
        offset: (page - 1) * limit,
    }
}

export function parseStringData(data: string): null | number| string | boolean {
    data = String(data)
    // If data is null or empty, return null
    if (!data || data.trim() === '') {
        return null;
    }

    // Try to parse data as JSON
    try {
        const parsedData = JSON.parse(data);
        return parsedData;
    } catch (error) {
        // If data is not a valid JSON string, ignore the error and proceed with other checks
    }

 

    // If data is a number, return it as a number
    if (!isNaN(Number(data))) {
        return Number(data);
    }

    
    // If data is a boolean, return it as a boolean
    if (data.toLowerCase() === 'true' || data.toLowerCase() === 'false') {
        return data.toLowerCase() === 'true';
    }

    // If none of the above checks are true, return the original data as a string
    return data;
}