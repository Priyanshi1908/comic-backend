addEventListener('fetch', event => {
	event.respondWith(handleRequest(event.request))
  })

  async function handleRequest(request) {
	if (request.method === 'POST') {
	  const { openaiKey, comicIdea } = await request.json()

	  if (!openaiKey || !comicIdea) {
		return new Response('Missing openaiKey or comicIdea', { status: 400 })
	  }

	  const prompts = await generateImagePrompts(openaiKey, comicIdea)
	  return new Response(JSON.stringify(prompts), {
		headers: { 'Content-Type': 'application/json' },
	  })
	}

	return new Response('Method not allowed', { status: 405 })
  }

  async function generateImagePrompts(openaiKey, comicIdea) {
	const response = await fetch('https://api.openai.com/v1/engines/davinci-codex/completions', {
	  method: 'POST',
	  headers: {
		'Content-Type': 'application/json',
		'Authorization': `Bearer ${openaiKey}`,
	  },
	  body: JSON.stringify({
		prompt: `Create a story from the following idea: ${comicIdea}. Provide five distinct image prompts that depict key scenes.`,
		max_tokens: 150,
		n: 1,
		stop: null,
		temperature: 0.7,
	  }),
	})

	const data = await response.json()
	const text = data.choices[0].text.trim()
	return text.split('\n').filter(line => line.length > 0).slice(0, 5)
  }