export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem('juem_session_token');
  const updatedInit = { ...(init || {}) };
  const headers = { ...(updatedInit.headers || {}) } as Record<string, string>;
  
  if (token && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  updatedInit.headers = headers;
  return window.fetch(input, updatedInit);
}
