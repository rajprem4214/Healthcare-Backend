import { Request, Response } from "express";



export async function healthcheckHandler(_req: Request, res: Response): Promise<void> {
    const memoryUsage = process.memoryUsage() ?? 0;
    //TODO: add db test and medplum test
    res.json({
      message: 'Uwell Backend -👋🌎🌍🌏',
      status: 'OK',
      memoryUsage: (memoryUsage.heapUsed * 100) / memoryUsage.heapTotal,
      uptime: process.uptime(),
    });
}