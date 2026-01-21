'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { LatLngBounds } from 'leaflet';
import ChatMessage from './ChatMessage';
import { sendMessage } from '@/lib/chatbot';
import { useSelection } from '@/context/SelectionContext';

interface ChatbotProps {
  mapBounds: LatLngBounds | null;
}

export default function Chatbot({ mapBounds }: ChatbotProps) {
  const { executeMapCommand } = useSelection();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: 'Hello! I\'m Lumina, your cosmic guide. I can help you discover dark sky sites, analyze light pollution, and navigate the map. How can I assist you?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const boundsStr = mapBounds
        ? `${mapBounds.getSouth()},${mapBounds.getWest()},${mapBounds.getNorth()},${mapBounds.getEast()}`
        : null;

      const data = await sendMessage(userMessage, boundsStr);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);

      if (data.action) {
        executeMapCommand(data.action);
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[1000] bg-nocturna-accent hover:bg-nocturna-accent/90 text-white rounded-full p-4 shadow-lg transition-transform hover:scale-105"
          aria-label="Open chatbot"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[1000] w-96 h-[600px] bg-nocturna-navy/95 backdrop-blur-sm rounded-lg shadow-2xl flex flex-col border border-nocturna-accent/20">
          <div className="flex items-center justify-between p-4 border-b border-nocturna-accent/20">
            <h2 className="text-lg font-semibold text-nocturna-light">Lumina - Cosmic Guide</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-nocturna-light/70 hover:text-nocturna-light transition-colors"
              aria-label="Close chatbot"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <ChatMessage key={idx} role={msg.role} content={msg.content} />
            ))}
            {isLoading && (
              <ChatMessage role="assistant" content="Thinking..." />
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-nocturna-accent/20">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about dark sky sites, light pollution..."
                className="flex-1 bg-nocturna-dark/50 text-nocturna-light placeholder-nocturna-light/50 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-nocturna-accent"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-nocturna-accent hover:bg-nocturna-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md px-4 py-2 transition-colors"
                aria-label="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
