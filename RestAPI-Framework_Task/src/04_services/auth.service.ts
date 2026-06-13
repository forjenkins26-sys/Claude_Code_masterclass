import { expect } from '@playwright/test';
import { AuthClient } from '../03_clients/auth.client';
import { buildAuthRequest } from '../05_utils/data-factory';

export class AuthService {
  private cachedToken: string | null = null;

  constructor(private readonly authClient: AuthClient) {}

  async getToken(): Promise<string> {
    if (this.cachedToken) return this.cachedToken;

    const response = await this.authClient.createToken(buildAuthRequest());
    expect(response.status()).toBe(200);

    const body = await response.json();
    if (!body.token || body.token === 'Bad credentials') {
      throw new Error(`Failed to obtain auth token. Response: ${JSON.stringify(body)}`);
    }

    this.cachedToken = body.token as string;
    return this.cachedToken;
  }

  clearToken(): void {
    this.cachedToken = null;
  }
}
