import { APIRequestContext, APIResponse } from '@playwright/test';
import { AuthRequest } from '../02_types/auth.types';

export class AuthClient {
  constructor(private readonly request: APIRequestContext) {}

  async createToken(body: AuthRequest): Promise<APIResponse> {
    return this.request.post('/auth', { data: body });
  }
}
