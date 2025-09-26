import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { encryptMessage, decryptMessage } from "../utils/cryptoUtils";
import { motion } from "framer-motion";

const MessagesPage = ({ myId, newChat }) => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const [newMessagesCount, setNewMessagesCount] = useState(0);

  const messagesContainerRef = useRef(null);
  const isUserAtBottomRef = useRef(true);
  const prevMessagesLenRef = useRef(0);
  const prevSelectedChatIdRef = useRef(null);

  const scrollToBottom = (smooth = true) => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
    setNewMessagesCount(0);
    isUserAtBottomRef.current = true;
  };

  const onMessagesScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 50; // within 50px
    isUserAtBottomRef.current = atBottom;
    if (atBottom) setNewMessagesCount(0);
  };

  // 1️⃣ Fetch chats
  useEffect(() => {
    const fetchChats = async () => {
      if (!myId) return;

      const { data: myParts } = await supabase
        .from("chat_participants")
        .select("chat_id, aes_key, chats (id, type, created_at)")
        .eq("user_id", myId);

      if (!myParts || myParts.length === 0) {
        setChats([]);
        setSelectedChat(null);
        return;
      }

      const chatIds = myParts.map((p) => p.chat_id);
      const { data: otherParts } = await supabase
        .from("chat_participants")
        .select("chat_id, user_id, Profiles(id, fullname, operator_id)")
        .in("chat_id", chatIds)
        .neq("user_id", myId);

      const formatted = myParts.map((p) => {
        const other = otherParts?.find((o) => o.chat_id === p.chat_id);
        return {
          chatId: p.chat_id,
          participantName: other?.Profiles?.fullname || "Unknown",
          operatorId: other?.Profiles?.operator_id || "",
          aesKey: p.aes_key,
          created_at: p.chats?.created_at,
          type: p.chats?.type,
        };
      });

      setChats(formatted);
      if (!selectedChat && formatted.length > 0) {
        setSelectedChat(formatted[0]);
      }
    };

    fetchChats();
  }, [myId, newChat]);

  // 2️⃣ Fetch messages
  useEffect(() => {
    if (!selectedChat) return;

    prevSelectedChatIdRef.current = selectedChat.chatId;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", selectedChat.chatId)
        .order("created_at", { ascending: true });

      const decrypted = (data || []).map((m) => ({
        ...m,
        content: (() => {
          try {
            return decryptMessage(m.content, selectedChat.aesKey);
          } catch {
            return m.content;
          }
        })(),
      }));

      setMessages(decrypted);
      setTimeout(() => scrollToBottom(false), 0);
      prevMessagesLenRef.current = decrypted.length;
    };

    fetchMessages();
  }, [selectedChat]);

  // 3️⃣ Realtime subscription
  useEffect(() => {
    if (!selectedChat) return;

    const channel = supabase
      .channel(`messages:${selectedChat.chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${selectedChat.chatId}`,
        },
        (payload) => {
          const m = payload.new;
          let content = m.content;
          try {
            content = decryptMessage(m.content, selectedChat.aesKey);
          } catch {}
          setMessages((prev) => [...prev, { ...m, content }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChat]);

  // 4️⃣ Typing indicator
  useEffect(() => {
    if (!selectedChat) return;

    const channel = supabase
      .channel(`typing:${selectedChat.chatId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_participants",
          filter: `chat_id=eq.${selectedChat.chatId}`,
        },
        (payload) => {
          const typing = payload.new;
          if (typing.user_id !== myId && typing.is_typing) {
            setTypingUsers((prev) => [...new Set([...prev, typing.user_id])]);
            setTimeout(
              () =>
                setTypingUsers((prev) =>
                  prev.filter((id) => id !== typing.user_id)
                ),
              2000
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChat]);

  // 5️⃣ Send message
  const sendMessage = async () => {
    if (!input.trim() || !selectedChat) return;

    const encrypted = encryptMessage(input, selectedChat.aesKey);
    await supabase.from("messages").insert({
      chat_id: selectedChat.chatId,
      sender_id: myId,
      content: encrypted,
    });

    setInput("");
    setTimeout(() => scrollToBottom(true), 50);
  };

  // 6️⃣ Handle typing
  const handleTyping = async (text) => {
    setInput(text);
    if (!selectedChat) return;

    await supabase
      .from("chat_participants")
      .update({ is_typing: true })
      .eq("chat_id", selectedChat.chatId)
      .eq("user_id", myId);

    setTimeout(async () => {
      await supabase
        .from("chat_participants")
        .update({ is_typing: false })
        .eq("chat_id", selectedChat.chatId)
        .eq("user_id", myId);
    }, 2000);
  };

  // 7️⃣ Auto-scroll when messages change
  useEffect(() => {
    const prevLen = prevMessagesLenRef.current;
    const newLen = messages.length;
    const selectedChanged =
      prevSelectedChatIdRef.current !== selectedChat?.chatId;

    if (selectedChanged) {
      setTimeout(() => scrollToBottom(false), 0);
      setNewMessagesCount(0);
    } else if (newLen > prevLen) {
      if (isUserAtBottomRef.current) {
        scrollToBottom(true);
      } else {
        setNewMessagesCount((c) => c + (newLen - prevLen));
      }
    }
    prevMessagesLenRef.current = newLen;
  }, [messages, selectedChat]);

  // Attach scroll listener
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.addEventListener("scroll", onMessagesScroll, { passive: true });
    isUserAtBottomRef.current = true;
    return () => el.removeEventListener("scroll", onMessagesScroll);
  }, [selectedChat]);

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Sidebar */}
      <aside className="w-1/4 border-r border-secondary/50 flex flex-col">
        <div className="p-4 font-mono text-secondary border-b border-secondary/50 items-center">
          CHATS
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => (
            <div
              key={chat.chatId}
              className={`p-4 font-mono cursor-pointer border-b border-secondary/30 hover:bg-secondary/10 ${
                selectedChat?.chatId === chat.chatId ? "bg-secondary/20" : ""
              }`}
              onClick={() => setSelectedChat(chat)}
            >
              <h4 className="text-primary">{chat.participantName}</h4>
              <p className="text-xs text-secondary italic">
                {chat.operatorId ? `(${chat.operatorId})` : ""}
              </p>
            </div>
          ))}
        </div>
      </aside>

      {/* Chat panel */}
      <section className="flex-1 flex flex-col">
        {/* Header */}
        <header className="p-4 border-b border-secondary/50 flex items-center">
  {selectedChat ? (
    <h2 className="text-primary font-mono text-base font-normal">
      {selectedChat.participantName}
      {selectedChat.operatorId && (
        <span className="text-secondary text-sm ml-2 font-light">
          ({selectedChat.operatorId})
        </span>
      )}
    </h2>
  ) : (
    <h2 className="text-primary font-mono text-base font-normal">No chat selected</h2>
  )}
</header>



        {/* Messages container */}
        <div className="flex-1 relative bg-background">
          <div
            ref={messagesContainerRef}
            className="absolute inset-0 overflow-y-auto p-4 space-y-3"
          >
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={`flex ${
                  msg.sender_id === myId ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[70%] px-3 py-2 rounded-lg font-mono text-sm ${
                    msg.sender_id === myId
                    ? "bg-gray-300 text-black dark:bg-gray-500 dark:text-white rounded-bl-none" // ✅ My messages
                    : "bg-gray-400 text-black dark:bg-gray-700 dark:text-white rounded-bl-none" // ✅ Received messages
                  }`}
                >
                  {msg.content}
                  <div className="text-[10px] text-secondary mt-1 text-right">
                    {msg.created_at
                      ? new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Jump button */}
          {newMessagesCount > 0 && (
            <button
              onClick={() => scrollToBottom(true)}
              className="absolute bottom-4 right-6 px-3 py-1 bg-primary text-black rounded-full font-mono text-xs shadow-md"
            >
              {newMessagesCount} new
            </button>
          )}
        </div>

        {/* Typing */}
        <div className="px-4 text-xs text-secondary italic h-4">
          {typingUsers.length > 0 && "User is typing..."}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-secondary/50 flex gap-2">
          <textarea
            value={input}
            onChange={(e) => handleTyping(e.target.value)}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none bg-transparent font-mono text-primary focus:outline-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button
            disabled={!input.trim()}
            onClick={sendMessage}
            className="px-4 py-2 bg-primary text-black font-mono rounded-md disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </section>
    </div>
  );
};

export default MessagesPage;