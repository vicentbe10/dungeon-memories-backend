
export async function openaiRequest(userMessage) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are a great storyteller such as JRR Tolkien or Patrick Rothfuss. You will receive transcripts of a DnD game included in a bigger campaign and you will provide an epic and extended summary about the status and the session itself in a sort of novel style? Keeping the veracity of the story please dont doubt to add dialogues or any other resource to make it more engaging.',
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
        frequency_penalty: 0.5,
        presence_penalty: 0.0,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error response from OpenAI:', errorData);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    // Filtering to just get the message. 
    const assistantMessage = data.choices[0].message.content.trim();
    return assistantMessage;
  } catch (error) {
    console.error('Error making OpenAI request:', error.message);
    throw error;
  }
}