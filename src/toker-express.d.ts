import type { Request, Response, NextFunction } from 'express';
import type { MyResponse } from './interfaces';

// Extend Express Request interface globally
declare global {
  namespace Express {
    interface Request {
      isProtected?: boolean;
      decodedAccessToken?: any;
      decodedRefreshToken?: any;
    }
  }
}

declare function refresh(req: Request, res: MyResponse, next: NextFunction): Promise<void>;
declare function decodeAccess(req: Request, _res: Response, next: NextFunction): void;
declare function decodeRefresh(req: Request, _res: Response, next: NextFunction): Promise<void>;

export { 
  refresh,
  decodeAccess,
  decodeRefresh,
};


