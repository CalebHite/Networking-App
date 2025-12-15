const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

type QueryValue = string | number | boolean | undefined | null;
type JsonResponse<T = unknown> = T;
type JsonRequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

const defaultHeaders: HeadersInit = {
  'Content-Type': 'application/json',
};

const serializeError = (response: Response, body: unknown) => {
  const defaultMessage = `Request failed with status ${response.status}`;
  if (body && typeof body === 'object' && body !== null) {
    const message = (body as Record<string, unknown>).error;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }
  return defaultMessage;
};

const buildQueryString = (params?: Record<string, QueryValue>) => {
  if (!params) {
    return '';
  }

  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    query.set(key, String(value));
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
};

async function request<T = unknown>(
  path: string,
  { body, headers, ...initProps }: JsonRequestOptions = {}
): Promise<JsonResponse<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...initProps,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  let responseBody: unknown = null;
  try {
    responseBody = await response.json();
  } catch {
    /* ignore */
  }

  if (!response.ok) {
    throw new Error(serializeError(response, responseBody));
  }

  return responseBody as JsonResponse<T>;
}

const get = <T = unknown>(
  path: string,
  params?: Record<string, QueryValue>
) => request<T>(`${path}${buildQueryString(params)}`, { method: 'GET' });

const post = <T = unknown>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body });

export const login = (payload: {
  username: string;
  password: string;
}) =>
  post<{ success: boolean; user?: Record<string, unknown>; error?: string }>(
    '/login',
    payload
  );

export const register = (payload: {
  username: string;
  password: string;
  phoneNumber: number;
  email: string;
}) =>
  post<{ success: boolean; user?: Record<string, unknown>; error?: string }>(
    '/register',
    payload
  );

export const updateUser = (payload: {
  username: string;
  phoneNumber?: number;
  email?: string;
  integrations?: string[];
  tasks?: string[];
  connections?: string[];
  events?: string[];
}) =>
  post<{ success: boolean; user?: Record<string, unknown>; error?: string }>(
    '/update-user',
    payload
  );

export const createEvent = (payload: {
  username: string;
  name: string;
}) =>
  post<{
    success: boolean;
    event?: Record<string, unknown>;
    user?: Record<string, unknown>;
    error?: string;
  }>('/create-event', payload);

export const updateEvent = (payload: {
  username: string;
  eventId: string;
  name?: string;
  date?: string;
  tasks?: string[];
}) =>
  post<{ success: boolean; event?: Record<string, unknown>; error?: string }>(
    '/update-event',
    payload
  );

export const createTask = (payload: {
  username: string;
  info: string;
  type: string;
  eventId?: string;
}) =>
  post<{ success: boolean; task?: Record<string, unknown>; error?: string }>(
    '/create-task',
    payload
  );

export const updateTask = (payload: {
  username: string;
  taskId: string;
  eventId?: string;
  info?: string;
  type?: string;
  status?: string;
}) =>
  post<{ success: boolean; task?: Record<string, unknown>; error?: string }>(
    '/update-task',
    payload
  );

export const deleteTask = (payload: {
  username: string;
  taskId: string;
}) =>
  post<{ success: boolean; error?: string }>('/delete-task', payload);

export const addConnection = (payload: {
  username: string;
  connectionId: string;
}) =>
  post<{ success: boolean; error?: string }>('/add-connection', payload);

export const removeConnection = (payload: {
  username: string;
  connectionId: string;
}) =>
  post<{ success: boolean; error?: string }>('/remove-connection', payload);

export const logout = () =>
  get<{ success: boolean; error?: string }>('/logout');

export const getEvents = (username: string) =>
  get<{ success: boolean; events?: unknown[]; error?: string }>('/get-events', {
    username,
  });

export const getEvent = (username: string, eventId: string) =>
  get<{ success: boolean; event?: Record<string, unknown>; error?: string }>(
    '/get-event',
    { username, eventId }
  );

export const getUserTasks = (username: string) =>
  get<{ success: boolean; tasks?: unknown[]; error?: string }>('/get-user-tasks', {
    username,
  });

export const getTask = (taskId: string) =>
  get<{ success: boolean; task?: Record<string, unknown>; error?: string }>(
    '/get-task',
    { taskId }
  );

export const getEventTasks = (username: string, eventId: string) =>
  get<{
    success: boolean;
    tasks?: unknown[];
    error?: string;
    event?: Record<string, unknown>;
  }>('/get-event-tasks', { username, eventId });

export const getConnections = (username: string) =>
  get<{ success: boolean; connections?: unknown[]; error?: string }>(
    '/get-connections',
    { username }
  );
