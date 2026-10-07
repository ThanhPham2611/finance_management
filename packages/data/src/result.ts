export type DataErrorCode = "VALIDATION" | "UNAUTHENTICATED" | "NOT_FOUND" | "SUPABASE";

export type DataError = { code: DataErrorCode; message: string };

export type DataResult<T> =
  | { data: T; error: null }
  | { data: null; error: DataError };

export function dataFailure(code: DataErrorCode, message: string): DataResult<never> {
  return { data: null, error: { code, message } };
}

export function dataSuccess<T>(data: T): DataResult<T> {
  return { data, error: null };
}
