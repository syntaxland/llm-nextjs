// app/page.tsx

"use client"

import { useState } from "react"
import Image from "next/image"
import PaysofterLogo from "./assets/paysofter-logo.png"

const Home = () => {
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return
    setLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: question }] }),
      })

      const text = await res.text()
      setAnswer(text)
    } catch (err) {
      console.error(err)
      setAnswer("❌ Error fetching answer.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <Image src={PaysofterLogo} width={250} alt="Paysofter Logo" />

      <h1>Brand Q&A Assistant</h1>

      <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about Sellangle, Paysofter, or Softglobal"
          style={{ width: "400px", padding: "0.5rem" }}
        />
        <button type="submit" style={{ marginLeft: "1rem", padding: "0.5rem 1rem" }}>
          Ask
        </button>
      </form>

      {loading && <p>Loading answer...</p>}

      {answer && (
        <div style={{ marginTop: "2rem", whiteSpace: "pre-wrap", border: "1px solid #ccc", padding: "1rem", borderRadius: "0.5rem" }}>
          {answer}
        </div>
      )}
    </main>
  )
}

export default Home 


// "use client"

// import Image from "next/image"
// import PaysofterLogo from "./assets/paysofter-logo.png"
// import { useChat } from "ai/react"
// import { Message } from "ai" 

// const Home = () => {
//   return (
//     <main>
//       <Image src={PaysofterLogo} width="250" alt="Paysofter Logo"/>
//     </main>
//   )
// }

// export default Home