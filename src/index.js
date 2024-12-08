export default {
	async fetch(request) {
	  try {
		if (request.method === 'OPTIONS') {
		  // Handle CORS preflight request
		  return new Response(null, {
			headers: {
			  'Access-Control-Allow-Origin': '*',
			  'Access-Control-Allow-Methods': 'POST, OPTIONS',
			  'Access-Control-Allow-Headers': 'Content-Type',
			},
		  });
		}
  
		if (request.method === 'POST') {
		  const { openaiKey, togetherApiKey, comicIdea } = await request.json();
  
		  if (!openaiKey || !togetherApiKey || !comicIdea) {
			return new Response('Missing openaiKey, togetherApiKey, or comicIdea', {
			  status: 400,
			  headers: { 'Access-Control-Allow-Origin': '*' },
			});
		  }
  
		  const { prompts, texts } = await generateImagePromptsAndTexts(openaiKey, comicIdea);
		  const images = await generateImages(togetherApiKey, prompts);
		  return new Response(JSON.stringify({ images, texts }), {
			headers: {
			  'Content-Type': 'application/json',
			  'Access-Control-Allow-Origin': '*',
			},
		  });
		}
  
		return new Response('Method not allowed', {
		  status: 405,
		  headers: { 'Access-Control-Allow-Origin': '*' },
		});
	  } catch (error) {
		return new Response(`Error: ${error.message}`, {
		  status: 500,
		  headers: { 'Access-Control-Allow-Origin': '*' },
		});
	  }
	}
  };
  
  async function generateImagePromptsAndTexts(openaiKey, comicIdea) {
	const response = await fetch('https://api.openai.com/v1/chat/completions', {
	  method: 'POST',
	  headers: {
		'Content-Type': 'application/json',
		'Authorization': `Bearer ${openaiKey}`,
	  },
	  body: JSON.stringify({
		model: "gpt-4o-mini",
		messages: [
		  {
			role: "system",
			content: "You are a creative assistant tasked with generating a comic book story."
		  },
		  {
			role: "user",
			content: `Create a detailed comic book story about: ${comicIdea}. For each of the 15 scenes, provide a vivid image prompt that explicitly states the image should be created in a comic book style. Use phrases like 'comic book art', 'comic book style', 'drawn in a comic book manner', and include dynamic poses, bold lines, and vibrant colors. Format each scene as follows:\n\nImage Prompt: [Description of the image in a comic book style]\nStory Text: [Detailed storytelling text that elaborates on the scene's significance and action]\n\nEnsure the story flows logically and maintains a cohesive narrative arc.`		  }
		],
		max_tokens: 1500,
		temperature: 0.7,
	  }),
	});
  
	if (!response.ok) {
	  throw new Error(`OpenAI API error: ${response.statusText}`);
	}
  
	const data = await response.json();
	const fullText = data.choices[0].message.content.trim();
	const lines = fullText.split('\n').filter(line => line.length > 0);
  
	const prompts = [];
	const texts = [];
  
	// Parse the structured response
	for (let i = 0; i < lines.length; i++) {
	  if (lines[i].startsWith("Image Prompt:")) {
		prompts.push(lines[i].replace("Image Prompt: ", "").trim());
	  } else if (lines[i].startsWith("Story Text:")) {
		texts.push(lines[i].replace("Story Text: ", "").trim());
	  }
	}
  
	return { prompts: prompts.slice(0, 15), texts: texts.slice(0, 15) };
  }
  
  async function generateImages(togetherApiKey, prompts) {
	const images = [];
	const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  
	for (const prompt of prompts) {
	  const response = await fetch('https://api.together.xyz/v1/images/generations', {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		  'Authorization': `Bearer ${togetherApiKey}`,
		},
		body: JSON.stringify({
		  model: "black-forest-labs/FLUX.1-schnell-Free",
		  prompt: prompt,
		  steps: 2,
		  n: 1,
		  response_format: "b64_json"
		}),
	  });
  
	  if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Together AI API error: ${response.statusText} - ${errorText}`);
	  }
  
	  const data = await response.json();
	  images.push(data.data[0].b64_json);
  
	  await delay(10000); // Wait for 10 seconds between requests
	}
  
	return images;
  }