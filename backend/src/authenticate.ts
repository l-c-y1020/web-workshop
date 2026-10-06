import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const authenticate: (req: Request, res: Response, next: NextFunction) => Response | void =
  (req, res, next) => {
    const authHeader = req.get("Authorization");
    if (!authHeader) {
      return res.status(401).send("401 Unauthorized: Missing Token");
    }
    const token = authHeader.substring(7);
    return jwt.verify(token, process.env.JWT_SECRET!, async (err, decoded) => {
      if (err || !decoded) {
        return res.status(401).send("401 Unauthorized: Token expired or invalid");
      }
      // 把 token 中的用户 uuid 存入 res.locals，供后续处理器使用
      const payload = decoded as { uuid?: string };
      res.locals.uuid = payload.uuid;
      return next();
    });
  };

export default authenticate;
