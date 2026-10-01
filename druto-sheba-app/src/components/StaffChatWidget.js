'use client';
import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Users } from 'lucide-react';

export default function StaffChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  
  const messagesEndRef = useRef(null);
  const isFirstOpenRef = useRef(true);
  const prevMsgCountRef = useRef(0);

  // Fetch current user details
  useEffect(() => {
    async function fetchUser() {
      try {
        const path = window.location.pathname;
        const isDispatcher = path.startsWith('/dashboard') || 
                            path.startsWith('/operations') || 
                            path.startsWith('/fleet') || 
                            path.startsWith('/trips') || 
                            path.startsWith('/dispatcher-reviews') || 
                            path.startsWith('/requests');
        const portalParam = isDispatcher ? 'dispatcher' : 'admin';
        
        const res = await fetch(`/api/auth/me?portal=${portalParam}`);
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data);
        }
      } catch (err) {
        console.error('Failed to fetch user session:', err);
      }
    }
    fetchUser();
  }, []);

  // Fetch and poll messages
  useEffect(() => {
    if (!currentUser) return;

    async function fetchMessages() {
      try {
        const res = await fetch('/api/chat?trip_id=staff_chat');
        if (res.ok) {
          const data = await res.json();
          const newMsgs = data.messages || [];
          setMessages(newMsgs);

          // Use role-specific storage key to prevent cross-tab overlap on same browser tests
          const storageKey = `staff_chat_last_seen_count_${currentUser.role}`;
          const lastSeenCountStr = localStorage.getItem(storageKey);
          const lastSeenCount = lastSeenCountStr ? parseInt(lastSeenCountStr, 10) : 0;

          if (newMsgs.length > lastSeenCount) {
            setHasNewMessages(true);
          }
        }
      } catch (err) {
        console.error('Failed to fetch chat messages:', err);
      }
    }

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Auto scroll to bottom and update last seen count when open
  useEffect(() => {
    if (isOpen && currentUser) {
      const messagesCount = messages.length;
      const hasNewMsg = messagesCount > prevMsgCountRef.current;
      prevMsgCountRef.current = messagesCount;

      if (isFirstOpenRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        isFirstOpenRef.current = false;
      } else if (hasNewMsg) {
        const lastMsg = messages[messages.length - 1];
        const myName = currentUser.username.startsWith('Bypass Dispatcher:') 
          ? currentUser.username 
          : `${currentUser.role}: ${currentUser.username}`;
        
        const isMyMsg = lastMsg && lastMsg.sender === myName;
        
        // Find scroll container (which is parent of messagesEndRef)
        const container = messagesEndRef.current?.parentNode;
        if (container) {
          const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
          if (isMyMsg || isNearBottom) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
      
      const storageKey = `staff_chat_last_seen_count_${currentUser.role}`;
      localStorage.setItem(storageKey, messagesCount.toString());
      setHasNewMessages(false);
    }
  }, [messages, isOpen, currentUser]);

  const toggleOpen = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      isFirstOpenRef.current = true;
      setHasNewMessages(false);
      if (currentUser) {
        const storageKey = `staff_chat_last_seen_count_${currentUser.role}`;
        localStorage.setItem(storageKey, messages.length.toString());
      }
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser) return;

    const senderName = currentUser.username.startsWith('Bypass Dispatcher:') 
      ? currentUser.username 
      : `${currentUser.role}: ${currentUser.username}`;
    const textToSend = inputText;
    setInputText('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_id: 'staff_chat',
          sender: senderName,
          text: textToSend
        })
      });

      if (res.ok) {
        // Optimistic update
        const updatedMessages = [
          ...messages,
          {
            message_id: Date.now(),
            sender: senderName,
            text: textToSend,
            timestamp: new Date().toISOString()
          }
        ];
        setMessages(updatedMessages);
        
        const storageKey = `staff_chat_last_seen_count_${currentUser.role}`;
        localStorage.setItem(storageKey, updatedMessages.length.toString());
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Only show for logged in staff who are fully verified (unverified pending dispatchers cannot access)
  if (!currentUser || currentUser.verification_status === 'Pending') return null;

  return (
    <>

      <style>{`
        .staff-chat-trigger-wrapper {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          width: 56px;
          height: 56px;
        }
        .staff-chat-trigger {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff2d55 0%, #d00045 100%);
          box-shadow: 0 8px 24px rgba(255, 45, 85, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .staff-chat-trigger:hover {
          transform: scale(1.08) translateY(-2px);
          box-shadow: 0 12px 32px rgba(255, 45, 85, 0.6);
        }
        .chat-notification-dot {
          position: absolute;
          top: 0px;
          right: 0px;
          width: 14px;
          height: 14px;
          background-color: #ff9f0a; /* Bright Orange dot */
          border-radius: 50%;
          border: 2px solid rgba(28, 22, 22, 0.96);
          box-shadow: 0 0 8px rgba(255, 159, 10, 0.9);
          z-index: 10;
        }
        .chat-notification-ring {
          position: absolute;
          top: -6px;
          left: -6px;
          right: -6px;
          bottom: -6px;
          border: 3px solid #ff9f0a;
          border-radius: 50%;
          animation: orangeRingPulse 1.5s cubic-bezier(0.24, 0, 0.38, 1) infinite;
          pointer-events: none;
          z-index: 5;
        }
        @keyframes orangeRingPulse {
          0% {
            transform: scale(0.95);
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            transform: scale(1.2);
            opacity: 0;
          }
        }
        .staff-chat-window {
          position: fixed;
          bottom: 96px;
          right: 24px;
          width: 360px;
          height: 500px;
          border-radius: 20px;
          background: rgba(28, 22, 22, 0.96);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
          display: flex;
          flex-direction: column;
          z-index: 9998;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .staff-chat-header {
          padding: 16px;
          background: rgba(255, 45, 85, 0.05);
          border-bottom: 1px solid rgba(255, 45, 85, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .staff-chat-header-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          font-size: 15px;
          color: #fff;
        }
        .staff-chat-close {
          background: none;
          border: none;
          color: var(--text-muted, #8e8e93);
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        .staff-chat-close:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
        }
        .staff-chat-messages {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          scrollbar-width: thin;
        }
        .staff-chat-bubble-container {
          display: flex;
          flex-direction: column;
          max-width: 75%;
        }
        .staff-chat-bubble-container.self {
          align-self: flex-end;
          align-items: flex-end;
        }
        .staff-chat-bubble-container.other {
          align-self: flex-start;
          align-items: flex-start;
        }
        .staff-chat-sender {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted, #8e8e93);
          margin-bottom: 3px;
          margin-left: 4px;
          margin-right: 4px;
        }
        .staff-chat-bubble {
          padding: 10px 14px;
          border-radius: 16px;
          font-size: 13px;
          line-height: 1.4;
          word-break: break-word;
          color: #fff;
        }
        .self .staff-chat-bubble {
          border-bottom-right-radius: 4px;
        }
        .other .staff-chat-bubble {
          border-bottom-left-radius: 4px;
        }
        .staff-chat-input-form {
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.02);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          gap: 10px;
        }
        .staff-chat-input {
          flex: 1;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 10px 14px;
          color: #fff;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s;
        }
        .staff-chat-input:focus {
          border-color: #ff2d55;
        }
        .staff-chat-send-btn {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #ff2d55;
          border: none;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s;
        }
        .staff-chat-send-btn:hover {
          background: #d00045;
          transform: scale(1.05);
        }
      `}</style>

      {/* Floating Trigger Wrapper */}
      <div className="staff-chat-trigger-wrapper">
        <div 
          className="staff-chat-trigger" 
          onClick={toggleOpen}
        >
          {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
          {hasNewMessages && !isOpen && <span className="chat-notification-dot" />}
          {hasNewMessages && !isOpen && <span className="chat-notification-ring" />}
        </div>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="staff-chat-window">
          <div className="staff-chat-header">
            <div className="staff-chat-header-title">
              <Users size={18} style={{ color: '#ff2d55' }} />
              <div>
                <div>Staff Channel</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted, #8e8e93)', fontWeight: 500 }}>Admins & Dispatchers</div>
              </div>
            </div>
            <button className="staff-chat-close" onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="staff-chat-messages">
            {messages.map((msg) => {
              const myName = currentUser.username.startsWith('Bypass Dispatcher:') 
                ? currentUser.username 
                : `${currentUser.role}: ${currentUser.username}`;
              const isSelf = msg.sender === myName;
              const isSenderAdmin = msg.sender?.startsWith('Admin:') || msg.sender?.includes('(Admin)');
              
              // Admin messages get Green (#30d158), Dispatcher messages get Blue (#0a84ff)
              const bubbleBg = isSenderAdmin ? '#30d158' : '#0a84ff';
              
              return (
                <div key={msg.message_id} className={`staff-chat-bubble-container ${isSelf ? 'self' : 'other'}`}>
                  <div className="staff-chat-sender">{msg.sender}</div>
                  <div className="staff-chat-bubble" style={{ backgroundColor: bubbleBg }}>
                    {msg.text}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="staff-chat-input-form">
            <input
              type="text"
              className="staff-chat-input"
              placeholder="Type operational note..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button type="submit" className="staff-chat-send-btn">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
