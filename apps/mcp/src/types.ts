export type ServerProps = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenKey: string;
  orgId: string;
  // Optional runtime controls from URL params
  maxCells?: number;
  withOTel?: boolean;
};
