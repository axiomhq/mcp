export type ServerProps = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenKey: string;
  orgId: string;
};
