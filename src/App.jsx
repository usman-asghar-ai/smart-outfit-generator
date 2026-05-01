import { useState, useRef } from 'react'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

function App() {
  const [image, setImage] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [imageType, setImageType] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please upload an image file.')
      return
    }
    setError(null)
    setResult(null)
    setImage(URL.createObjectURL(file))
    setImageType(file.type)
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target.result.split(',')[1]
      setImageBase64(base64)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleGenerate = async () => {
    if (!imageBase64) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inline_data: {
                      mime_type: imageType,
                      data: imageBase64,
                    },
                  },
                  {
                    text: `You are a professional fashion stylist. Analyze this outfit image and provide:

1. **Outfit Analysis** - Describe what you see (colors, style, pieces)
2. **What Works Well** - Compliment what is working
3. **Style Suggestions** - 3 specific ways to improve or style this outfit
4. **Occasion Ideas** - Where this outfit would work best
5. **Accessory Tips** - Accessories that would complement this look

Be friendly, encouraging, and specific. Keep your response concise and practical.`,
                  },
                ],
              },
            ],
          }),
        }
      )

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error?.message || 'API request failed')
      }

      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error('No response from Gemini. Please try again.')
      setResult(text)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatResult = (text) => {
    return text.split('\n').map((line, i) => {
      if (line.match(/^\*\*(.*)\*\*$/)) {
        return (
          <h3 key={i} className="text-base font-semibold text-gray-800 mt-5 mb-1">
            {line.replace(/\*\*/g, '')}
          </h3>
        )
      }
      if (line.match(/\*\*(.*?)\*\*/)) {
        const html = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        return (
          <p key={i} className="text-gray-700 mb-1 text-sm"
            dangerouslySetInnerHTML={{ __html: html }} />
        )
      }
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return (
          <li key={i} className="text-gray-700 ml-5 mb-1 list-disc text-sm">
            {line.slice(2)}
          </li>
        )
      }
      if (line.match(/^\d\./)) {
        return <p key={i} className="text-gray-700 mb-2 text-sm">{line}</p>
      }
      if (line.trim() === '') return <br key={i} />
      return <p key={i} className="text-gray-700 mb-1 text-sm">{line}</p>
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-10">

        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Smart Outfit Generator</h1>
          <p className="text-gray-500 text-lg">Upload a photo and get instant AI-powered style advice</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          <div className="flex flex-col gap-4">
            <div
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-purple-400 bg-purple-50'
                  : 'border-gray-300 hover:border-purple-300 hover:bg-purple-50'
              }`}
              onClick={() => fileInputRef.current.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
            >
              {image ? (
                <img
                  src={image}
                  alt="Uploaded outfit"
                  className="max-h-80 mx-auto rounded-xl object-contain"
                />
              ) : (
                <div className="py-10">
                  <div className="text-5xl mb-4">👗</div>
                  <p className="text-gray-600 font-medium mb-1">Drop your outfit photo here</p>
                  <p className="text-gray-400 text-sm">or click to browse</p>
                  <p className="text-gray-400 text-xs mt-2">JPG, PNG, WEBP supported</p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />

            {image && (
              <button
                onClick={() => {
                  setImage(null)
                  setImageBase64(null)
                  setResult(null)
                  setError(null)
                }}
                className="text-sm text-gray-400 hover:text-gray-600 underline text-center"
              >
                Remove photo and start over
              </button>
            )}

            <button
              onClick={handleGenerate}
              disabled={!imageBase64 || loading}
              className={`w-full py-4 rounded-2xl font-semibold text-white text-lg transition-all ${
                !imageBase64 || loading
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 active:scale-95'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analysing your outfit...
                </span>
              ) : (
                'Generate Style Advice'
              )}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 min-h-64 flex flex-col">
            {!result && !loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 py-10">
                <div className="text-4xl mb-3">✨</div>
                <p className="font-medium">Your style advice will appear here</p>
                <p className="text-sm mt-1">Upload a photo and click Generate</p>
              </div>
            )}

            {loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                <div className="text-4xl mb-4 animate-bounce">👗</div>
                <p className="text-gray-500 font-medium">Our AI stylist is reviewing your outfit...</p>
                <p className="text-gray-400 text-sm mt-1">This takes about 5–10 seconds</p>
              </div>
            )}

            {result && (
              <div className="overflow-y-auto">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                  <span className="text-xl">✨</span>
                  <h2 className="font-semibold text-gray-800">Your Style Report</h2>
                </div>
                <div className="leading-relaxed">{formatResult(result)}</div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-gray-400 text-xs mt-8">
          Powered by Google Gemini AI · Your photos are never stored
        </p>
      </div>
    </div>
  )
}

export default App
