'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Mic, Plus, X, Play, Pause, Flame, Loader, Download, Trash2 } from "lucide-react"

export function LlmPodcastEngine() {
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

  const audioRef = useRef<HTMLAudioElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const validateUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const addUrl = () => {
    if (newUrl && !urls.includes(newUrl) && validateUrl(newUrl)) {
      setUrls([...urls, newUrl]);
      setNewUrl('');
    }
  };

  const removeUrl = (urlToRemove: string) => {
    setUrls(urls.filter(url => url !== urlToRemove))
  }

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
                setCurrentStatus('Audio is ready. Click the play button to listen.')
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
      setCurrentStatus("Failed to connect to server")
      setIsLoading(false)
    }
  }

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

  return (
    <div className="min-h-screen flex flex-col font-light bg-gradient-to-br from-gray-900 to-black text-white">
      <header className="bg-black/50 backdrop-blur-sm shadow-lg border-b border-orange-500/20 h-16 fixed w-full z-50">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-medium bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
          Podcast engine
          </h1>
          <div className="text-sm text-orange-400/60">
          AI-driven news podcast generator
          </div>
        </div>
      </header>
      <main className="flex-grow flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-7xl">
          <Card className="w-full rounded-xl shadow-2xl overflow-hidden bg-black/40 backdrop-blur-md border-orange-500/30 border">
            <CardContent className="p-8 flex flex-col lg:flex-row gap-8 h-[calc(100vh-12rem)]">
              <motion.div 
                className="w-full lg:w-1/2 flex flex-col space-y-6"
                initial={{ width: "100%" }}
                animate={{ width: isExpanded ? "50%" : "100%" }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                <div className="flex space-x-3">
                  <Input
                    type="url"
                    placeholder="Enter news website URL..."
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="flex-grow bg-white/5 border-orange-500/30 focus:border-orange-500 focus:ring-orange-500/20 transition-all duration-300"
                  />
                  <Button 
                    onClick={addUrl} 
                    className="bg-orange-500 hover:bg-orange-600 text-black font-medium transition-all duration-300 shadow-lg hover:shadow-orange-500/20"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>

                <ScrollArea className="flex-grow rounded-lg border border-orange-500/20 bg-black/20 p-4">
                  <div className="space-y-3">
                    {urls.map((url, index) => (
                      <motion.div 
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between bg-white/5 p-3 rounded-lg hover:bg-white/10 transition-all duration-300"
                      >
                        <span className="truncate text-orange-300/80">{url}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeUrl(url)} 
                          className="text-orange-300/60 hover:text-orange-300 hover:bg-red-500/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>

                <Button 
                  onClick={fetchNews} 
                  disabled={isLoading} 
                  className={`w-full py-6 text-lg font-medium transition-all duration-300 ${
                    isLoading 
                      ? 'bg-orange-500/50 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg hover:shadow-orange-500/20'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Flame className="mr-3 h-5 w-5 animate-pulse" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Mic className="mr-3 h-5 w-5" />
                      Generate Podcast
                    </>
                  )}
                </Button>
              </motion.div>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div 
                    className="w-full lg:w-1/2 flex flex-col space-y-6 rounded-xl relative overflow-hidden"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "50%", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  >
                    {isLoading && !newsScript ? (
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-black/20 backdrop-blur-sm flex items-center justify-center">
                        <div className="text-center space-y-4">
                          <Loader className="h-8 w-8 animate-spin text-orange-500" />
                          <p className="text-orange-300">{currentStatus}</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {currentStatus && (
                          <div className="bg-orange-500/10 border border-orange-500/30 text-orange-300 p-4 rounded-lg">
                            {currentStatus}
                          </div>
                        )}
                        <ScrollArea className="flex-grow rounded-lg border border-orange-500/20 bg-black/20 p-6" ref={scrollAreaRef}>
                          <pre className="whitespace-pre-wrap font-light text-orange-100/90 leading-relaxed">
                            {newsScript}
                          </pre>
                        </ScrollArea>

                        {showAudio && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4 p-4 bg-white/5 rounded-lg border border-orange-500/20"
                          >
                            <div className="relative">
                              <audio 
                                ref={audioRef} 
                                src={audioSrc} 
                                className="w-full h-12 opacity-0" 
                              />
                              <div className="absolute inset-0 flex items-center justify-between bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-md px-4">
                                <Button 
                                  onClick={togglePlayPause} 
                                  className="bg-orange-500 hover:bg-orange-600 text-white"
                                  disabled={isAudioLoading}
                                >
                                  {isAudioLoading ? (
                                    <Loader className="h-5 w-5 animate-spin" />
                                  ) : isPlaying ? (
                                    <Pause className="h-5 w-5" />
                                  ) : (
                                    <Play className="h-5 w-5" />
                                  )}
                                </Button>
                                <div className="text-orange-300 text-sm">
                                  {isAudioLoading ? 'Loading...' : (isPlaying ? 'playing' : 'Paused')}
                                </div>
                                <Button
                                  onClick={downloadAudio}
                                  className="bg-black/40 hover:bg-black/60 border border-orange-500/30 text-orange-400"
                                  disabled={isAudioLoading}
                                >
                                  <Download className="h-5 w-5" />
                                </Button>
                              </div>
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
    </div>
  )
}