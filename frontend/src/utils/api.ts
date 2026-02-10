const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

/** Map network/backend errors to user-friendly messages. */
function toFriendlyError(err: unknown): string {
  if (err instanceof TypeError && err.message === 'Failed to fetch') {
    return 'The service is unavailable. It may be starting up — please try again in a moment.';
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('networkerror')) {
      return 'The service is unavailable. It may be starting up — please try again in a moment.';
    }
    if (msg.includes('timeout') || msg.includes('aborted')) {
      return 'The request took too long. Please try again.';
    }
    return err.message;
  }
  return 'Something went wrong. Please try again.';
}

export interface AskResponse {
  answer?: string;
  [key: string]: unknown;
}

export interface CvData {
  profile?: {
    name?: string;
    jobTitle?: string;
    contact?: { email?: string; phone?: string };
    links?: { github?: string; linkedin?: string };
    location?: string;
  };
  experience?: Array<{ role?: string; company?: string; dates?: string; location?: string | null }>;
  projects?: Array<{ name?: string; url?: string; description?: string }>;
  education?: unknown[];
  skills?: Record<string, string[] | string>;
}

export async function getCvData(): Promise<CvData> {
  try {
    const res = await fetch(`${API_BASE}/cv`);
    if (!res.ok) {
      throw new Error(res.status === 500 ? 'The service is temporarily unavailable. Please try again in a moment.' : 'Unable to load profile.');
    }
    return res.json() as Promise<CvData>;
  } catch (err) {
    throw new Error(toFriendlyError(err));
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function askQuestion(question: string, history?: ChatMessage[]): Promise<string | AskResponse> {
  try {
    const res = await fetch(`${API_BASE}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, history: history ?? [] }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { detail?: string | unknown[]; error?: string };
      const raw = body?.detail ?? body?.error ?? res.statusText;
      const message = Array.isArray(raw) ? raw.map((e: unknown) => (e as { msg?: string })?.msg ?? e).join(', ') : raw;
      const friendly = res.status === 500
        ? 'The service is temporarily unavailable. Please try again in a moment.'
        : (typeof message === 'string' ? message : `Request failed (${res.status})`);
      throw new Error(friendly);
    }

    const data = (await res.json()) as AskResponse;
    return data;
  } catch (err) {
    throw new Error(toFriendlyError(err));
  }
}
