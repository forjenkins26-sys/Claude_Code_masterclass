import { test, expect } from '../src/fixtures/api-fixtures';

test.describe('Authentication', () => {

  test('verify token generated with valid credentials', async ({ authService }) => {
    const token = await authService.getToken();
    expect(token).toBeTruthy();
    expect(token.length).toBeGreaterThan(0);
  });

  test('verify bad credentials returns "Bad credentials" body', async ({ authClient }) => {
    const response = await authClient.createToken({
      username: 'wronguser',
      password: 'wrongpassword'
    });
    // Restful Booker returns 200 even for bad creds — must check body
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.reason).toBe('Bad credentials');
  });

});
