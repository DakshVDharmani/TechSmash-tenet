import { motion } from 'framer-motion';
import { useState } from 'react';
import { mockConversations, mockMessages } from '../data/mockData';

const MessagesPage = () => {
  const [selectedConv, setSelectedConv] = useState(mockConversations[0]);

  return (
    // 👇 fit below navbar, full-page layout
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <header className="p-8 border-b border-secondary/50 shrink-0">
        <h1 className="font-mono text-3xl text-primary">SECURE_MESSAGING</h1>
      </header>

      {/* Content */}
      <div className="flex-grow grid grid-cols-12 overflow-hidden">
        {/* Conversations List */}
        <div className="col-span-4 border-r border-secondary/50 overflow-y-auto">
          {mockConversations.map((conv) => (
            <div
              key={conv.id}
              className={`p-4 font-mono border-b border-secondary/50 cursor-pointer hover:bg-secondary/10 ${
                selectedConv.id === conv.id ? 'bg-secondary/20' : ''
              }`}
              onClick={() => setSelectedConv(conv)}
            >
              <h4 className="text-primary">{conv.user.name}</h4>
              <p className="text-xs text-secondary truncate">{conv.lastMessage}</p>
            </div>
          ))}
        </div>

        {/* Messages Panel */}
        <div className="col-span-8 flex flex-col">
          {/* Messages List */}
          <div className="flex-grow p-8 space-y-4 overflow-y-auto">
            {mockMessages.map((msg, i) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`font-mono text-sm ${msg.isMe ? 'text-right' : 'text-left'}`}
              >
                <p
                  className={`inline-block p-2 ${
                    msg.isMe ? 'text-highlight' : 'text-primary'
                  }`}
                >
                  {msg.content}
                </p>
                <p className="text-xs text-secondary">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-4 border-t border-secondary/50 shrink-0">
            <input
              type="text"
              placeholder="> SEND_MESSAGE..."
              className="w-full bg-transparent font-mono text-primary focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
