export type RequestStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export interface RequestState<T> {
  readonly status: RequestStatus;
  readonly data: T | null;
  readonly error: string | null;
}

export const requestState = {
  idle<T>(): RequestState<T> {
    return { status: 'idle', data: null, error: null };
  },
  loading<T>(): RequestState<T> {
    return { status: 'loading', data: null, error: null };
  },
  success<T>(data: T): RequestState<T> {
    return { status: 'success', data, error: null };
  },
  empty<T>(data: T): RequestState<T> {
    return { status: 'empty', data, error: null };
  },
  error<T>(error: unknown): RequestState<T> {
    return {
      status: 'error',
      data: null,
      error: error instanceof Error ? error.message : 'An unexpected data error occurred.',
    };
  },
};
