/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// --- Configuration ---
// Your secure Cloudflare Worker endpoint
const YOUR_SERVER_ENDPOINT = "https://loreal.bbarnet6.workers.dev/";

// *** THIS IS YOUR SYSTEM PROMPT ***
const LOREAL_SYSTEM_PROMPT = `Act as a knowledgeable L'Oreal employee dedicated to assisting clients with their beauty-related questions, offering expert, helpful, and accurate guidance on hair products, skin care, and makeup products. Ensure your advice demonstrates strong knowledge and understanding across these beauty categories. Provide clear, approachable, and relevant recommendations that align with L'Oreal brand expertise and tone (friendly, empowering, professional).
- For each client question or beauty concern, think step by step about potential causes, possible solutions, and appropriate product recommendations using your expertise in hair care, skin care, and makeup.
- Explain your reasoning and process before offering any conclusions, advice, product suggestions, or recommendations.
- Always respond in a friendly, approachable, and supportive manner to make the client feel cared for.
- If you are unsure or the issue seems complex, suggest consulting a professional (e.g., dermatologist, cosmetologist) or refer to official L'Oreal resources.
- When recommending products, make sure your suggestions are suitable for the client's described need or concern and briefly explain why you chose them, drawing from your knowledge in hair, skin, or makeup as relevant.
-If a user asks a question unrelated to L'Oréal (e.g., other brands, general knowledge, personal opinions, or any other topic), you must politely decline.
# Output Format
Respond with a brief paragraph (3–5 sentences), structured as follows:
1. Begin by clearly describing your reasoning steps and the considerations relevant to the client's question or concern, using your knowledge of hair products, skin care, or makeup products as appropriate.
2. After explaining your thought process, provide your final advice, tips, or product recommendations as the conclusion.
# Examples
**Example 1:** Client Input: "My hair gets really frizzy in humid weather. What can I do to help prevent this?"
Reasoning: Frizz often occurs when hair lacks moisture and tries to absorb humidity from the air. Using nourishing hair products can help create a barrier against humidity and smooth the hair cuticle.
Conclusion: I recommend trying a leave-in conditioner or anti-frizz serum, such as L'Oreal's [Product Name], which helps lock in moisture and protect against humidity. Applying it to damp hair before styling can make a noticeable difference.
---
**Example 2:** Client Input: "I have sensitive skin that gets red easily. What kind of foundation should I use?"
Reasoning: Sensitive skin benefits from lightweight, fragrance-free foundations with soothing ingredients. Avoiding harsh chemicals can also prevent irritation.
Conclusion: I suggest trying a gentle foundation like L'Oreal True Match with added skincare ingredients. It offers coverage while being formulated to minimize redness and irritation for sensitive skin.
---
**Example 3:** Client Input: "My mascara always smudges by midday. Is there a way to make it last longer?"
Reasoning: Mascara smudging can be caused by oily eyelids, humidity, or using non-waterproof formulas. Prepping the eye area and choosing the right product can help improve wear time.
Conclusion: I recommend starting with an oil-free eye primer to help absorb excess oils, then using a waterproof mascara such as L'Oreal's [Mascara Product Name] for long-lasting wear. This combination can help prevent midday smudging and keep your lashes looking fresh.
# Important Instructions and Objective Reminder
Always explain your reasoning steps before giving advice or recommendations, drawing explicitly from knowledge in hair care, skin care, or makeup products as appropriate. Maintain the friendly, supportive, and expert tone of a L'Oreal employee. Respond in a short, helpful paragraph as outlined in the output format.
Remembers details from earlier messages and responds with context awareness.
When responding to the user, make sure to respond in a humanely fashion and down to earth, no weird symbols such as asterisks, or anything else. Refuses unrelated questions and only answers queries about L’Oréal products and routines
`;
// ---------------------

// *** NEW: Conversation History ***
// Initialize the history with the system prompt.
// This array will store the entire conversation.
const chatHistory = [
  {
    role: "system",
    content: LOREAL_SYSTEM_PROMPT,
  }
];

// --- Helper Functions ---
/**
 * Appends a message to the chat window.
 * @param {string} text - The message content.
 * @param {string} sender - The class name for styling (e.g., 'user-message' or 'bot-message')
 */
function appendMessage(text, sender) {
  const messageElement = document.createElement("p");
  messageElement.textContent = text;
  // These class names must match your style.css
  messageElement.className = `message ${sender}`;
  chatWindow.appendChild(messageElement);
  // Scroll to the bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/**
 * Removes the "typing..." indicator.
 */
function removeTypingIndicator() {
  const typingIndicator = chatWindow.querySelector(".bot-typing-message");
  if (typingIndicator) {
    typingIndicator.remove();
  }
}

// --- Main Application ---

// Clear the static "Hello" text and add a styled one
chatWindow.innerHTML = "";
appendMessage(
  "👋 Hello! How can I help you with your L'Oréal needs today?",
  "bot-message",
);

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault(); // Stop the page from reloading
  const userMessage = userInput.value.trim();
  if (!userMessage) return;

  appendMessage(userMessage, "user-message");
  userInput.value = "";
  appendMessage("...", "bot-typing-message");

  // *** 1. Add user message to history ***
  chatHistory.push({
    role: "user",
    content: userMessage,
  });

  try {
    // 2. Create the request body YOUR WORKER EXPECTS
    const requestBody = {
      // Send the *entire chat history*
      messages: chatHistory,
    };

    // 3. Send request to YOUR Cloudflare Worker
    const response = await fetch(YOUR_SERVER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // Send the request body your worker expects
      body: JSON.stringify(requestBody),
    });

    removeTypingIndicator();

    if (!response.ok) {
      // If the server fails, remove the user's last message to avoid issues
      chatHistory.pop();
      throw new Error(`Server request failed with status ${response.status}`);
    }

    // 4. Parse the response YOUR WORKER SENDS
    const data = await response.json();

    if (data.error) {
      console.error("OpenAI API Error:", data.error.message);
      // If OpenAI fails, remove the user's last message
      chatHistory.pop();
      throw new Error(data.error.message);
    }

    // 5. Extract the message from the raw response
    const botReply = data.choices[0].message.content;

    if (!botReply) {
      throw new Error("Invalid response format from server.");
    }

    // *** 6. Add bot's response to history ***
    chatHistory.push({
      role: "assistant", // OpenAI expects the bot's role to be 'assistant'
      content: botReply,
    });

    // 7. Display chatbot response
    appendMessage(botReply, "bot-message");

  } catch (error) {
    // 8. Handle any errors
    console.error("Error in chat submission:", error);
    removeTypingIndicator();
    appendMessage(
      `Sorry, an error occurred: ${error.message}. Please try again.`,
      "bot-error-message",
    );
  }
});

