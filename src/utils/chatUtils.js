import { supabase } from "../supabaseClient";
import { generateAESKey } from "./cryptoUtils";

// Create or get existing chat between two users
export const createOrGetChat = async (userId1, userId2) => {
  try {
    // 1️⃣ Get all chat_ids for userId2
    const { data: user2Chats, error: user2Error } = await supabase
      .from("chat_participants")
      .select("chat_id")
      .eq("user_id", userId2);
    if (user2Error) throw user2Error;

    const user2ChatIds = user2Chats.map(c => c.chat_id);

    // 2️⃣ Check if userId1 has a chat with any of those chat_ids
    const { data: existing, error: checkError } = await supabase
      .from("chat_participants")
      .select("*")
      .eq("user_id", userId1)
      .in("chat_id", user2ChatIds);

    if (checkError) throw checkError;

    if (existing.length > 0) {
      const chatId = existing[0].chat_id;
      const partData = existing.find(p => p.user_id === userId1);
      return { chatId, aesKey: partData.aes_key };
    }

    // 3️⃣ Create new chat
    const { data: chatData, error: chatError } = await supabase
      .from("chats")
      .insert([{ type: "direct" }])
      .select()
      .single();
    if (chatError) throw chatError;

    const chatId = chatData.id;

    // 4️⃣ Generate AES key
    const aesKey = generateAESKey();

    // 5️⃣ Insert both participants
    await supabase.from("chat_participants").insert([
      { chat_id: chatId, user_id: userId1, aes_key: aesKey },
      { chat_id: chatId, user_id: userId2, aes_key: aesKey }
    ]);

    return { chatId, aesKey };
  } catch (err) {
    console.error("createOrGetChat error:", err);
    return null;
  }
};