import type { Request, Response, NextFunction } from 'express';

export interface RowWithTokens {
  accessToken?: string;
  refreshToken?: string;
  [key: string]: any;
}

declare function refresh(req: Request, res: Response, next: NextFunction): void;
declare function decodeAccess(req: Request, res: Response, next: NextFunction): void;
declare function decodeRefresh(req: Request, res: Response, next: NextFunction): void;

export { 
  refresh,
  decodeAccess,
  decodeRefresh,
};


