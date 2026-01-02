import type { Request, Response, NextFunction } from 'express';

declare function createTokens(req: Request, res: Response, next: NextFunction): void;
declare function refreshTokens(req: Request, res: Response, next: NextFunction): void;
declare function parseBearer(req: Request, res: Response, next: NextFunction): void;
declare function decodeAccess(_req: Request, res: Response, next: NextFunction): void;
declare function decodeRefresh(req: Request, res: Response, next: NextFunction): void;

export { 
  createTokens,
  refreshTokens,
  parseBearer,
  decodeAccess,
  decodeRefresh,
};


