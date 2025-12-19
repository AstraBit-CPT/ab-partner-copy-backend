import {Request} from 'express';

/**
 * Interface for authentication providers.
 * Partners should implement this interface to provide their own authentication logic.
 *
 * The purpose of this interface is to extract the external user ID from incoming requests
 * based on the partner's authentication mechanism (JWT, session, API key, etc.).
 */
export interface IAuthProvider {
  /**
   * Extracts the external user ID from the incoming request.
   *
   * @param req - Express request object containing headers, cookies, body, etc.
   * @returns Promise resolving to the external user ID as a string
   * @throws Error if authentication fails or user cannot be identified
   *
   * @example
   * // JWT-based implementation
   * async getUserId(req: Request): Promise<string> {
   *   const token = req.headers.authorization?.split(' ')[1];
   *   const decoded = jwt.verify(token, secret);
   *   return decoded.userId;
   * }
   *
   * @example
   * // Session-based implementation
   * async getUserId(req: Request): Promise<string> {
   *   return req.session.userId;
   * }
   *
   * @example
   * // Custom header implementation
   * async getUserId(req: Request): Promise<string> {
   *   return req.headers['x-user-id'] as string;
   * }
   */
  getUserId(req: Request): Promise<string>;
}
