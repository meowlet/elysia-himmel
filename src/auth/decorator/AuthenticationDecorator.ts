interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticationService {
  authenticate(username: string, password: string): Promise<User | null>;
  validateToken(token: string): Promise<boolean>;
}

export class BasicAuthenticationService implements AuthenticationService {
  async authenticate(username: string, password: string): Promise<User | null> {
    console.log(`Authenticating user: ${username}`);

    if (username === "demo" && password === "password") {
      return {
        id: 1,
        username: "demo",
        email: "demo@example.com",
        firstName: "Demo",
        lastName: "User",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;
    }

    return null;
  }

  async validateToken(token: string): Promise<boolean> {
    console.log(`Validating token: ${token.substring(0, 10)}...`);
    return token.length > 20;
  }
}

export abstract class AuthenticationDecorator implements AuthenticationService {
  protected wrappedService: AuthenticationService;

  constructor(service: AuthenticationService) {
    this.wrappedService = service;
  }

  async authenticate(username: string, password: string): Promise<User | null> {
    return this.wrappedService.authenticate(username, password);
  }

  async validateToken(token: string): Promise<boolean> {
    return this.wrappedService.validateToken(token);
  }
}

export class LoggingAuthDecorator extends AuthenticationDecorator {
  async authenticate(username: string, password: string): Promise<User | null> {
    console.log(
      `[LOG] Authentication attempt for user: ${username} at ${new Date().toISOString()}`
    );

    const startTime = performance.now();
    const result = await this.wrappedService.authenticate(username, password);
    const endTime = performance.now();

    if (result) {
      console.log(`[LOG] Authentication successful for user: ${username}`);
    } else {
      console.log(`[LOG] Authentication failed for user: ${username}`);
    }

    console.log(
      `[LOG] Authentication took ${Math.round(endTime - startTime)}ms`
    );

    return result;
  }

  async validateToken(token: string): Promise<boolean> {
    console.log(
      `[LOG] Token validation attempt at ${new Date().toISOString()}`
    );

    const startTime = performance.now();
    const result = await this.wrappedService.validateToken(token);
    const endTime = performance.now();

    console.log(`[LOG] Token validation ${result ? "successful" : "failed"}`);
    console.log(`[LOG] Validation took ${Math.round(endTime - startTime)}ms`);

    return result;
  }
}

export class RateLimitAuthDecorator extends AuthenticationDecorator {
  private attempts: Map<string, { count: number; lastAttempt: number }> =
    new Map();
  private maxAttempts: number;
  private windowMs: number;

  constructor(
    service: AuthenticationService,
    maxAttempts: number = 5,
    windowMs: number = 60000
  ) {
    super(service);
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  async authenticate(username: string, password: string): Promise<User | null> {
    const now = Date.now();
    const userAttempts = this.attempts.get(username) || {
      count: 0,
      lastAttempt: now,
    };

    if (now - userAttempts.lastAttempt > this.windowMs) {
      userAttempts.count = 0;
    }

    userAttempts.count++;
    userAttempts.lastAttempt = now;
    this.attempts.set(username, userAttempts);

    if (userAttempts.count > this.maxAttempts) {
      console.log(`Rate limit exceeded for user: ${username}`);
      throw new Error(
        `Too many login attempts. Please try again in ${Math.ceil(
          this.windowMs / 60000
        )} minutes.`
      );
    }

    const result = await this.wrappedService.authenticate(username, password);

    if (result) {
      this.attempts.delete(username);
    }

    return result;
  }
}

export class TwoFactorAuthDecorator extends AuthenticationDecorator {
  private verificationCodes: Map<number, string> = new Map();

  constructor(service: AuthenticationService) {
    super(service);
  }

  async authenticate(username: string, password: string): Promise<User | null> {
    const user = await this.wrappedService.authenticate(username, password);

    if (user) {
      const verificationCode = this.generateVerificationCode();
      this.verificationCodes.set(user.id, verificationCode);

      console.log(
        `2FA code generated for user ${username}: ${verificationCode}`
      );

      return null;
    }

    return null;
  }

  async verifySecondFactor(userId: number, code: string): Promise<User | null> {
    const storedCode = this.verificationCodes.get(userId);

    if (storedCode && storedCode === code) {
      this.verificationCodes.delete(userId);

      return {
        id: userId,
        username: "retrieved_user",
        email: "user@example.com",
        firstName: "Retrieved",
        lastName: "User",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;
    }

    return null;
  }

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
