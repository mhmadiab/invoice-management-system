//Represents current authenticate user and security context
export type Actor = {
  administratorId: bigint;
  businessId: bigint;
  sessionId: bigint;
};

export type Page = { page: number; pageSize: number };
