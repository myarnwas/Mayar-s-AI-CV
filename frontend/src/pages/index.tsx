import React, { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react';
import Head from 'next/head';
import Sidebar from '@/components/Sidebar';
import MessageContent from '@/components/MessageContent';
import { askQuestion } from '@/utils/api';
import { playSendSound, playReceiveSound } from '@/utils/sounds';

const INITIAL_AI_MESSAGE =
  "Hi! I'm Mayar's AI assistant. Ask me anything about his experience, projects, skills, education, or how to get in touch.";

type Message = { role: 'user' | 'ai'; content: string; timestamp: number };

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: INITIAL_AI_MESSAGE, timestamp: Date.now() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const sendQuestion = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const userTs = Date.now();
    setMessages((prev) => [...prev, { role: 'user', content: trimmed, timestamp: userTs }]);
    setInput('');
    setLoading(true);
    playSendSound();

    try {
      const result = await askQuestion(trimmed);
      const text = typeof result === 'string' ? result : result?.answer ?? 'No answer received.';
      setMessages((prev) => [...prev, { role: 'ai', content: text, timestamp: Date.now() }]);
      playReceiveSound();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setMessages((prev) => [...prev, { role: 'ai', content: `Sorry — ${errorMessage}`, timestamp: Date.now() }]);
      playReceiveSound();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendQuestion(input);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuestion(input);
    }
  };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://personal-ai-cv.onrender.com';
  const ogImageUrl = `${siteUrl}/og-image.png`;

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 110)}px`;
  };

  return (
    <>
      <Head>
        <title>Mayar Kabaja — AI CV Assistant</title>
        <meta name="description" content="Chat with Mayar's AI assistant. Ask about his experience, projects, skills, and education." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta property="og:title" content="Mayar Kabaja — AI CV Assistant" />
        <meta property="og:description" content="Chat with Mayar's AI assistant. Ask about his experience, projects, skills, and education." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:url" content={ogImageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:alt" content="Mayar Kabaja — AI CV Assistant" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Mayar Kabaja — AI CV Assistant" />
        <meta name="twitter:description" content="Chat with Mayar's AI assistant. Ask about his experience, projects, skills, and education." />
        <meta name="twitter:image" content={ogImageUrl} />
      </Head>
      <div className="app">
        <div className="ambient-glow" aria-hidden="true" />
        <Sidebar onAskQuestion={sendQuestion} disabled={loading} />

        <main className="chat-area">
          <header className="topbar ai-card">
            <div className="ai-card-icon" aria-hidden="true">🤖</div>
            <div className="ai-card-text">
              <div className="topbar-name">Mayar&apos;s AI CV Assistant</div>
              <div className="topbar-sub">Ask about experience, projects, skills</div>
            </div>
            <div className="live-badge">
              <span className="live-dot" aria-hidden="true" />
              <span>Online</span>
            </div>
          </header>

          <div className="messages">
            <div className="welcome welcome-desktop">
              <span className="welcome-icon">✦</span>
              <div className="welcome-title">
                Mayar Kabaja — <span>AI CV Assistant</span>
              </div>
              <div className="welcome-desc">
                Ask about his experience, projects, skills, education, or how to contact him.
              </div>
            </div>
            <div className="welcome welcome-mobile">
              <div className="welcome-dot" />
              <span className="welcome-text">Mayar Kabaja — <span className="welcome-accent">AI CV Assistant</span></span>
            </div>

            <div className="divider">
              <div className="divider-line" />
              <span className="divider-text">Start of conversation</span>
              <div className="divider-line" />
            </div>

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`msg ${msg.role}`}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className={`msg-av ${msg.role}`}>{msg.role === 'ai' ? 'MK' : '👤'}</div>
                <div className="msg-body">
                  <div className="bubble">
                    {msg.role === 'ai' ? (
                      <MessageContent content={msg.content} />
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="msg ai">
                <div className="msg-av ai">MK</div>
                <div className="msg-body">
                  <div className="typing-bubble">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="chat-bottom-bar">
            <div className="chat-flags">
              {[
                { q: "Tell me about Mayar's work experience", label: 'Work Experience' },
                { q: "What are Mayar's technical skills?", label: 'Tech Skills' },
                { q: "Tell me about Mayar's projects", label: 'Key Projects' },
                { q: "What is Mayar's education background?", label: 'Education' },
                { q: "What backend stack does Mayar use?", label: 'Backend Stack' },
                { q: "What cloud technologies does Mayar know?", label: 'Cloud & DevOps' },
                { q: 'Why should I hire Mayar?', label: 'Why Hire Me?' },
                { q: 'How can I contact Mayar?', label: 'Contact Me' },
              ].map(({ q, label }) => (
                <button
                  key={q}
                  type="button"
                  className="chat-flag"
                  onClick={() => sendQuestion(q)}
                  disabled={loading}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="input-zone">
              <form onSubmit={handleSubmit}>
                <div className="input-box">
                  <textarea
                    ref={textareaRef}
                    className="chat-input"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about skills, projects, experience…"
                    rows={1}
                    disabled={loading}
                  />
                  <button type="submit" className="send-btn" disabled={loading || !input.trim()} aria-label="Send">
                    <SendIcon />
                  </button>
                </div>
                <div className="input-hint">
                  <em>Enter</em> to send &nbsp;·&nbsp; <em>Shift+Enter</em> for new line
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
