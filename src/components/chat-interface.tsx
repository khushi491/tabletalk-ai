'use client';

import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport } from 'ai';
import { useRef, useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, User, Bot, Loader2, Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Part that has text (e.g. text, reasoning) */
function getPartText(part: { type: string; text?: string }): string {
  return 'text' in part && typeof part.text === 'string' ? part.text : '';
}

interface ChatInterfaceProps {
  restaurantId: string;
}

export function ChatInterface({ restaurantId }: ChatInterfaceProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationReady, setConversationReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to create conversation');
        return res.json();
      })
      .then((data: { conversationId: string }) => {
        if (!cancelled && data.conversationId) {
          setConversationId(data.conversationId);
          setConversationReady(true);
        }
      })
      .catch((err) => {
        if (!cancelled) console.error('Create conversation error:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  if (!conversationReady || !conversationId) {
    return (
      <Card className="flex flex-col h-full border-0 shadow-none sm:border sm:shadow-sm">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
            </Avatar>
            <span className="block text-lg">TableTalk Host</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin opacity-50" />
            <p>Starting conversation...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <ChatWithTransport restaurantId={restaurantId} conversationId={conversationId} />
  );
}

interface ChatWithTransportProps {
  restaurantId: string;
  conversationId: string;
}

type SpeechRecognitionResultList = Array<{ length: number; isFinal: boolean; 0: { transcript: string } }>;
type SpeechRecognitionConstructor = new () => {
  start: () => void;
  stop: () => void;
  abort: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: SpeechRecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition
    || (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition
    || null;
}

function ChatWithTransport({ restaurantId, conversationId }: ChatWithTransportProps) {
  const [inputValue, setInputValue] = useState('');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionConstructor> | null>(null);

  useEffect(() => {
    setIsSpeechSupported(Boolean(getSpeechRecognition()));
  }, []);

  const startListening = () => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition || isLoading) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event: { results: SpeechRecognitionResultList }) => {
      const results = event.results;
      const transcript = Array.from(results)
        .map((r) => r[0].transcript)
        .join('');
      if (results[results.length - 1].isFinal) {
        setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript).trim());
      }
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  const playText = async (text: string) => {
    if (!isVoiceEnabled) return;
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error('TTS failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      const revoke = () => URL.revokeObjectURL(url);
      audio.addEventListener('ended', revoke, { once: true });
      audio.addEventListener('error', revoke, { once: true });
      audio.play();
    } catch (error) {
      console.error('Audio playback error:', error);
    }
  };

  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: '/api/chat',
        body: { restaurantId, conversationId },
      }),
    [restaurantId, conversationId]
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    onFinish: ({ message }) => {
      if (message.role === 'assistant') {
        const text = message.parts
          .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
          .map((p) => p.text)
          .join(' ');
        if (text) playText(text);
      }
    },
  });

  const isLoading = status === 'submitted' || status === 'streaming';
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    sendMessage({ text: inputValue });
    setInputValue('');
  };

  return (
    <Card className="flex flex-col h-full border-0 shadow-none sm:border sm:shadow-sm">
      <CardHeader className="border-b px-6 py-4 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
          </Avatar>
          <div>
            <span className="block text-lg">TableTalk Host</span>
            <span className="block text-xs font-normal text-muted-foreground">Always here to help</span>
          </div>
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
          title={isVoiceEnabled ? 'Disable Voice' : 'Enable Voice'}
        >
          {isVoiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </Button>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden relative">
        <ScrollArea className="h-full px-6">
          <div className="space-y-4 py-6">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-10">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Hello! I&apos;m the virtual host for this restaurant.</p>
                <p>Ask me about our menu, hours, or policies.</p>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'flex w-full gap-3 max-w-[80%]',
                  m.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                )}
              >
                <Avatar className={cn('h-8 w-8 mt-1', m.role === 'user' ? 'bg-primary' : 'bg-muted')}>
                  <AvatarFallback className={m.role === 'user' ? 'text-primary-foreground' : ''}>
                    {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm',
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  )}
                >
                  {m.parts.map((part, i) => {
                    if (part.type === 'text') {
                      return <span key={i}>{getPartText(part)}</span>;
                    }
                    if (part.type === 'reasoning') {
                      return (
                        <div key={i} className="text-xs italic opacity-70 mb-1">
                          {getPartText(part)}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex w-full gap-3 max-w-[80%] mr-auto">
                <Avatar className="h-8 w-8 mt-1 bg-muted">
                  <AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <div className="rounded-lg px-4 py-2 text-sm bg-muted text-foreground flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about reservations, menu, etc..."
            className="flex-1"
            autoFocus
            disabled={isLoading}
          />
          {isSpeechSupported && (
            <Button
              type="button"
              variant={isListening ? 'default' : 'outline'}
              size="icon"
              onClick={isListening ? stopListening : startListening}
              disabled={isLoading}
              title={isListening ? 'Stop listening' : 'Speak'}
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              <span className="sr-only">{isListening ? 'Stop listening' : 'Speak'}</span>
            </Button>
          )}
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !inputValue.trim()}
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
