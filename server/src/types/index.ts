import { Request as ExpressRequest } from "express";

export interface AuthRequest extends ExpressRequest {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}
