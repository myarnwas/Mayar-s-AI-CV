import React, { useEffect, useState } from 'react';
import { getCvData, type CvData } from '@/utils/api';
import QuickQuestions from './QuickQuestions';

const PILL_TYPES = ['blue', 'green', 'purple', 'orange'] as const;

function getInitials(name: string | undefined): string {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/* Order: most important first (backend, languages, frameworks, then rest) */
const SKILL_CATEGORIES: string[] = [
  'backend',
  'programmingLanguages',
  'frameworks',
  'frontEnd',
  'cloud',
  'aiSkills',
  'tools',
  'practices',
  'additional',
];

const SKILL_TYPE_BY_KEY: Record<string, (typeof PILL_TYPES)[number]> = {
  backend: 'blue',
  frontEnd: 'green',
  aiSkills: 'purple',
  programmingLanguages: 'purple',
  cloud: 'orange',
  frameworks: 'green',
  tools: 'blue',
  practices: 'orange',
  additional: 'green',
};

const MAX_PILLS = 24;
const MAX_PER_CATEGORY = 6;

/** Build a map of skill label -> pill type from category arrays (excluding special keys) */
function buildSkillTypeMap(skills: Record<string, unknown>): Map<string, (typeof PILL_TYPES)[number]> {
  const map = new Map<string, (typeof PILL_TYPES)[number]>();
  for (const key of SKILL_CATEGORIES) {
    const arr = skills[key];
    if (!Array.isArray(arr)) continue;
    const type = SKILL_TYPE_BY_KEY[key] ?? 'blue';
    for (const s of arr) {
      const label = String(s).trim();
      if (label && !map.has(label)) map.set(label, type);
    }
  }
  return map;
}

function buildSkillPills(skills: CvData['skills']): { label: string; type: (typeof PILL_TYPES)[number] }[] {
  if (!skills || typeof skills !== 'object') return [];
  const typeMap = buildSkillTypeMap(skills as Record<string, unknown>);
  const seen = new Set<string>();
  const pills: { label: string; type: (typeof PILL_TYPES)[number] }[] = [];

  // Use "important" list first (for mobile: start with most important / mix)
  const important = skills.important;
  if (Array.isArray(important)) {
    for (const s of important) {
      const label = String(s).trim();
      if (label && !seen.has(label)) {
        seen.add(label);
        pills.push({ label, type: typeMap.get(label) ?? 'blue' });
        if (pills.length >= MAX_PILLS) return pills;
      }
    }
  }

  // Then fill from categories in order
  for (const key of SKILL_CATEGORIES) {
    const arr = skills[key];
    if (!Array.isArray(arr)) continue;
    const type = SKILL_TYPE_BY_KEY[key] ?? 'blue';
    for (const s of arr.slice(0, MAX_PER_CATEGORY)) {
      const label = String(s).trim();
      if (label && !seen.has(label)) {
        seen.add(label);
        pills.push({ label, type });
        if (pills.length >= MAX_PILLS) return pills;
      }
    }
  }
  return pills;
}

interface SidebarProps {
  onAskQuestion?: (question: string) => void;
  disabled?: boolean;
}

export default function Sidebar({ onAskQuestion, disabled = false }: SidebarProps) {
  const [cv, setCv] = useState<CvData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCvData()
      .then(setCv)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <aside className="sidebar">
        <div className="profile sidebar-error">
          <div className="profile-name sidebar-error-msg">{error}</div>
          <button
            type="button"
            className="sidebar-retry"
            onClick={() => {
              setError(null);
              setLoading(true);
              getCvData()
                .then(setCv)
                .catch((e) => setError(e instanceof Error ? e.message : 'Unable to load. Please try again.'))
                .finally(() => setLoading(false));
            }}
          >
            Try again
          </button>
        </div>
      </aside>
    );
  }

  const profile = cv?.profile ?? {};
  const name = profile.name ?? 'Mayar Kabaja';
  const jobTitle = profile.jobTitle ?? 'Fullstack Developer';
  const location = profile.location ?? (cv?.experience?.[0]?.location) ?? 'Palestine';
  const availability = ' · Available for remote';
  const skills = buildSkillPills(cv?.skills);
  const github = profile.links?.github ?? '';
  const linkedin = profile.links?.linkedin ?? '';
  const email = profile.contact?.email ?? '';

  return (
    <aside className="sidebar">
      <div className="profile">
        <div className="avatar-row">
          <div className="avatar">{loading ? '…' : getInitials(name)}</div>
          <div className="avatar-info">
            <div className="profile-name">{name}</div>
            <div className="profile-role">{(jobTitle || 'Fullstack Developer').toUpperCase()}</div>
          </div>
        </div>
        <div className="profile-loc">
          <span>📍</span> {location}{availability}
        </div>
        <div className="skills-wrap">
          {(loading ? [] : skills.length ? skills : [
            { label: 'Node.js', type: 'blue' },
            { label: 'React', type: 'green' },
            { label: 'Next.js', type: 'purple' },
            { label: 'AWS', type: 'orange' },
          ]).map((s) => (
            <span key={s.label} className={`pill ${s.type}`}>
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <QuickQuestions
        onSelect={onAskQuestion ?? (() => {})}
        disabled={disabled}
      />
      <div className="contact-bar">
        {github ? (
          <a href={github} target="_blank" rel="noopener noreferrer" className="soc">
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
            GitHub
          </a>
        ) : null}
        {linkedin ? (
          <a href={linkedin} target="_blank" rel="noopener noreferrer" className="soc">
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            LinkedIn
          </a>
        ) : null}
        {email ? (
          <a href={`mailto:${email}`} className="soc">
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
            </svg>
            Email
          </a>
        ) : null}
      </div>
    </aside>
  );
}
