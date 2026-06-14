/**
 * Test user data
 * Note: Use environment variables for sensitive data in production
 */

export interface TestUser {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export const VALID_USER: TestUser = {
  email: process.env.FB_TEST_EMAIL || 'test@example.com',
  password: process.env.FB_TEST_PASSWORD || 'Test@123456',
  firstName: 'Test',
  lastName: 'User',
};

export const INVALID_USERS = {
  INVALID_EMAIL_FORMAT: {
    email: 'notanemail',
    password: 'ValidPass@123',
  },
  EMPTY_EMAIL: {
    email: '',
    password: 'ValidPass@123',
  },
  EMPTY_PASSWORD: {
    email: 'test@example.com',
    password: '',
  },
  BOTH_EMPTY: {
    email: '',
    password: '',
  },
  WRONG_CREDENTIALS: {
    email: 'wrong@example.com',
    password: 'WrongPass@123',
  },
  LONG_EMAIL: {
    email: 'a'.repeat(300) + '@example.com',
    password: 'ValidPass@123',
  },
  SPECIAL_CHARS_EMAIL: {
    email: 'test+tag@example.com',
    password: 'ValidPass@123',
  },
  SQL_INJECTION_EMAIL: {
    email: "' OR '1'='1",
    password: 'anything',
  },
  XSS_EMAIL: {
    email: '<script>alert("XSS")</script>',
    password: 'anything',
  },
};

export const REGISTRATION_DATA = {
  VALID: {
    firstName: 'John',
    lastName: 'Doe',
    emailOrPhone: `test${Date.now()}@example.com`,
    password: 'SecurePass@123',
    day: '15',
    month: '5',
    year: '1990',
    gender: 'male' as const,
  },
  INVALID_EMAIL: {
    firstName: 'John',
    lastName: 'Doe',
    emailOrPhone: 'invalidemail',
    password: 'SecurePass@123',
    day: '15',
    month: '5',
    year: '1990',
    gender: 'male' as const,
  },
  UNDERAGE: {
    firstName: 'Young',
    lastName: 'User',
    emailOrPhone: `young${Date.now()}@example.com`,
    password: 'SecurePass@123',
    day: '1',
    month: '1',
    year: new Date().getFullYear() - 10 + '',
    gender: 'female' as const,
  },
};
