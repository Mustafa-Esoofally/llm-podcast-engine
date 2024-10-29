'use client'

// 1. Import necessary React hooks and components
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Mic, Plus, X, Play, Pause, Flame, Loader, Download } from "lucide-react"

// 2. Define the main LlmPodcastEngine component
export function LlmPodcastEngine() {
  // 3. Set up state variables using useState hook
  const [isLoading, setIsLoading] = useState(false)
  const [newsScript, setNewsScript] = useState('')
  const [urls, setUrls] = useState(['https://techcrunch.com/', 'https://www.theverge.com/', 'https://news.ycombinator.com/'])
  const [newUrl, setNewUrl] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [showAudio, setShowAudio] = useState(false)
  const [isAudioLoading, setIsAudioLoading] = useState(false)
  const [audioSrc, setAudioSrc] = useState('')
  const [currentStatus, setCurrentStatus] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  // 4. Create refs for audio and scroll area
  const audioRef = useRef<HTMLAudioElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // 5. Function to validate URL
  const validateUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  // 6. Function to add a new URL
  const addUrl = () => {
    if (newUrl && !urls.includes(newUrl) && validateUrl(newUrl)) {
      setUrls([...urls, newUrl]);
      setNewUrl('');
    }
  };

  // 7. Function to remove a URL
  const removeUrl = (urlToRemove: string) => {
    setUrls(urls.filter(url => url !== urlToRemove))
  }

  // 8. Function to fetch news and generate podcast
  const fetchNews = async () => {
    setIsLoading(true)
    setIsExpanded(true)
    setNewsScript('')
    setShowAudio(false)
    setCurrentStatus('')
    setAudioSrc('')

    try {
      const response = await fetch('/api/generate-podcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Response body is not readable')
      }

      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))
            switch (data.type) {
              case 'update':
                setCurrentStatus(data.message)
                break
              case 'content':
                setNewsScript(prev => prev + data.content)
                break
              case 'complete':
                setAudioSrc(`/${data.audioFileName}`)
                setShowAudio(true)
                setIsLoading(false)
                setIsAudioLoading(true)
                setCurrentStatus('Audio ready. Click play to listen.')
                break
              case 'error':
                console.error("Error:", data.message)
                setCurrentStatus(`Error: ${data.message}`)
                setIsLoading(false)
                break
            }
          }
        }
      }
    } catch (error) {
      console.error('Fetch failed:', error)
      setCurrentStatus("Connection to server failed")
      setIsLoading(false)
    }
  }

  // 11. Function to toggle play/pause of audio
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  // 12. Function to download the generated audio
  const downloadAudio = () => {
    if (audioSrc) {
      const link = document.createElement('a')
      link.href = audioSrc
      link.download = 'podcast.mp3'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // 13. Use effect hook to set up audio event listeners
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener('loadeddata', () => setIsAudioLoading(false))
      audioRef.current.addEventListener('ended', () => setIsPlaying(false))
      return () => {
        audioRef.current?.removeEventListener('loadeddata', () => setIsAudioLoading(false))
        audioRef.current?.removeEventListener('ended', () => setIsPlaying(false))
      }
    }
  }, [])

  // 14. Define gradient animation for loading state
  const gradientAnimation = {
    initial: {
      background: 'linear-gradient(45deg, #FF8C00, #000000)',
    },
    animate: {
      background: [
        'linear-gradient(45deg, #FF8C00, #000000)',
        'linear-gradient(45deg, #000000, #FF8C00)',
      ],
      transition: {
        duration: 5,
        repeat: Infinity,
        ease: "linear"
      }
    }
  }

  // 15. Render the component
  return (
    <motion.div 
      className="min-h-screen flex flex-col font-light text-white"
      initial="initial"
      animate={isLoading ? "animate" : "initial"}
      variants={gradientAnimation}
    >
      {/* 16. Header section */}
      <header className="bg-black shadow-sm h-16">
        <div className="max-w-7xl mx-auto h-full flex items-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-light text-white">Podcast Engine</h1>
        </div>
      </header>
      {/* 17. Main content section */}
      <main className="flex-grow flex items-center justify-center py-4">
        <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="w-full rounded-lg shadow-lg overflow-hidden bg-black border-orange-500 border">
            <CardContent className="p-6 flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)]">
              {/* 18. URL input and list section */}
              <motion.div 
                className="w-full lg:w-1/2 flex flex-col space-y-4"
                initial={{ width: "100%" }}
                animate={{ width: isExpanded ? "50%" : "100%" }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                <div className="flex space-x-2">
                  <Input
                    type="url"
                    placeholder="Enter a URL (e.g., https://example.com)"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="flex-grow bg-gray-800 text-white border-orange-500"
                  />
                  <Button onClick={addUrl} className="bg-orange-500 hover:bg-orange-600 text-black">
                    <Plus className="h-4 w-4 mr-2" />
                    Add URL
                  </Button>
                </div>
                <ScrollArea className="flex-grow">
                  <div className="space-y-2">
                    {urls.map((url, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-800 p-2 rounded">
                        <span className="truncate text-orange-300">{url}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeUrl(url)} className="text-white hover:text-orange-300">
                          <X className="h-4 w-4" />
                          <span className="sr-only">Remove {url}</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <Button 
                  onClick={fetchNews} 
                  disabled={isLoading} 
                  className="w-full bg-gradient-to-r from-orange-500 to-black text-white font-light"
                >
                  {isLoading ? (
                    <>
                      <Flame className="mr-2 h-4 w-4 animate-pulse" />
                      Generating Podcast
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-4 w-4" />
                      Generate Podcast
                    </>
                  )}
                </Button>
              </motion.div>
              {/* 19. Podcast content and audio player section */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div 
                    className="w-full lg:w-1/2 flex flex-col space-y-4 bg-black rounded-lg relative overflow-hidden"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "50%", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  >
                    {isLoading && !newsScript ? (
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-black flex items-center justify-center">
                        <p className="text-white text-center">{currentStatus}</p>
                      </div>
                    ) : (
                      <>
                        {currentStatus && (
                          <div className="bg-orange-500 text-black p-2 rounded-md mb-2">
                            {currentStatus}
                          </div>
                        )}
                        <ScrollArea className="flex-grow rounded-md p-4 bg-black" ref={scrollAreaRef}>
                          <pre className="whitespace-pre-wrap font-light text-white">{newsScript}</pre>
                        </ScrollArea>
                        {showAudio && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="space-y-2"
                          >
                            <audio 
                              ref={audioRef} 
                              src={audioSrc} 
                              className="w-full" 
                              controls 
                              onLoadedData={() => setIsAudioLoading(false)}
                            />
                            <div className="flex space-x-2">
                              <Button 
                                onClick={togglePlayPause} 
                                className="flex-grow bg-gradient-to-r from-orange-500 to-black text-white font-light"
                                disabled={isAudioLoading}
                              >
                                {isAudioLoading ? (
                                  <>
                                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                                    Loading Audio
                                  </>
                                ) : isPlaying ? (
                                  <>
                                    <Pause className="mr-2 h-4 w-4" />
                                    Pause Audio
                                  </>
                                ) : (
                                  <>
                                    <Play className="mr-2 h-4 w-4" />
                                    Play Audio
                                  </>
                                )}
                              </Button>
                              <Button
                                onClick={downloadAudio}
                                className="bg-orange-500 hover:bg-orange-600 text-black"
                                disabled={isAudioLoading}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </main>
      {/* 20. Footer section */}
    </motion.div>
  )
}
