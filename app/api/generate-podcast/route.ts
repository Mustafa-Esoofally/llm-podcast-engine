import { NextResponse } from 'next/server'
import FirecrawlApp from '@mendable/firecrawl-js'
import { ElevenLabsClient } from 'elevenlabs'
import Groq from 'groq-sdk'

// Initialize clients
const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY!
})

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY!
})

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!
})

export async function POST(req: Request) {
  const encoder = new TextEncoder()
  const { urls } = await req.json()

  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  const sendUpdate = async (data: any) => {
    await writer.write(
      encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
    )
  }

  const processUrls = async () => {
    try {
      // 1. Scrape content from URLs
      await sendUpdate({ type: 'update', message: 'Scraping content from provided URLs...' })
      
      const scrapedContent = await Promise.all(
        urls.map(async (url: string) => {
          const crawlResponse = await firecrawl.crawlUrl(url, {
            limit: 100,
            scrapeOptions: {
              formats: ['markdown', 'html'],
            }
          })

          if (!crawlResponse.success) {
            throw new Error(`Failed to crawl ${url}: ${crawlResponse.error}`)
          }

          return crawlResponse.text
        })
      )

      // 2. Generate podcast script using Groq
      await sendUpdate({ type: 'update', message: 'Generating podcast script...' })
      
      const prompt = `Create an engaging podcast script from the following content. 
        Make it conversational and natural-sounding:
        ${scrapedContent.join('\n\n')}`

      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'mixtral-8x7b-32768',
        temperature: 0.7,
        max_tokens: 4096,
        stream: true
      })

      let scriptContent = ''
      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content || ''
        scriptContent += content
        await sendUpdate({ type: 'content', content })
      }

      // 3. Convert script to audio using ElevenLabs
      await sendUpdate({ type: 'update', message: 'Converting script to audio...' })
      
      const timestamp = Date.now()
      const fileName = `podcast-${timestamp}.mp3`
      const audioPath = `public/${fileName}`
      
      // Create write stream for the audio file
      const fileStream = await Bun.write(audioPath, new Uint8Array())
      
      // Generate audio with streaming
      const audioStream = await elevenlabs.generate({
        text: scriptContent,
        voice_id: 'pNInz6obpgDQGcFmaJgB',
        model_id: 'eleven_multilingual_v2',
        stream: true
      })

      // Process the audio stream
      for await (const chunk of audioStream) {
        await fileStream.write(chunk)
      }

      await fileStream.flush()
      await fileStream.close()

      // 4. Send completion message
      await sendUpdate({ 
        type: 'complete', 
        audioFileName: fileName,
        message: 'Podcast generation complete!'
      })

    } catch (error) {
      console.error('Error:', error)
      await sendUpdate({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      })
    } finally {
      await writer.close()
    }
  }

  // Start processing in the background
  processUrls()

  // Return the readable stream
  return new NextResponse(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
