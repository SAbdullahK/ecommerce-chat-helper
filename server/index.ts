// import 'dotenv/config'
// import express, { Express, Request, Response } from "express"
// import { MongoClient } from "mongodb"
// import { callAgent } from './agent'
// import cors from 'cors'

// const app: Express = express()
// app.use(cors())
// app.use(express.json())

// const Client = new MongoClient(process.env.MONGODB_ATLAS_URI as string)

// async function startServer() {
//     try {
//         await Client.connect()
//         await Client.db("admin").command({ ping: 1 })
//         console.log("You have successfully connected to MongoDB")

//         // Routes
//         app.get('/', (req: Request, res: Response) => {
//             res.send('LangGraph Agent Server')
//         })

//         app.post('/chat', async (req: Request, res: Response) => {
//             const initialMessage = req.body.message
//             const threadId = Date.now().toString()
//             console.log(initialMessage)
//             try {
//                 const response = await callAgent(Client, initialMessage, threadId)
//                 res.json({ threadId, response })
//             } catch (error) {
//                 console.error('Error starting conversation:', error)
//                 res.status(500).json({ error: 'Internal server error' })
//             }
//         })

//         app.post('/chat/:threadId', async (req: Request, res: Response) => {
//             const { threadId } = req.params
//             const { message } = req.body
//             try {
//                 const response = await callAgent(Client, message, threadId)
//                 res.json({ response })
//             } catch (error) {
//                 console.error('Error in chat:', error)
//                 res.status(500).json({ error: 'Internal server error' })
//             }
//         })

//         // Start server (outside of routes)
//         const PORT = process.env.PORT || 8000
//         app.listen(PORT, () => {
//             console.log(`Server running on port ${PORT}`)
//         })

//     } catch (error) {
//         console.error('Error Connecting to MongoDB:', error)
//         process.exit(1)
//     }
// }

// startServer()
import 'dotenv/config'
import express, { Express, Request, Response } from "express"
import { MongoClient } from "mongodb"
import { callAgent } from './agent'
import cors from 'cors'

const app: Express = express()
app.use(cors())
app.use(express.json())

const Client = new MongoClient(process.env.MONGODB_ATLAS_URI as string)

// --- Safe wrapper for callAgent with retries ---
async function safeCallAgent(client: any, message: string, threadId: string) {
    let attempts = 0
    while (attempts < 3) {
        try {
            return await callAgent(client, message, threadId)
        } catch (err: any) {
            attempts++
            console.error(`callAgent failed (attempt ${attempts}):`, err?.message || err)

            // Retry only on Gemini overload (503)
            if (err.message && err.message.includes("503")) {
                if (attempts < 3) {
                    await new Promise(r => setTimeout(r, attempts * 2000)) // exponential backoff
                }
            } else {
                throw err // Other errors → don’t retry
            }
        }
    }
    throw new Error("callAgent failed after 3 attempts")
}

async function startServer() {
    try {
        await Client.connect()
        await Client.db("admin").command({ ping: 1 })
        console.log("You have successfully connected to MongoDB")

        // Routes
        app.get('/', (req: Request, res: Response) => {
            res.send('LangGraph Agent Server')
        })

        app.post('/chat', async (req: Request, res: Response) => {
            const initialMessage = req.body.message
            const threadId = Date.now().toString()
            console.log(initialMessage)
            try {
                const response = await safeCallAgent(Client, initialMessage, threadId)
                res.json({ threadId, response })
            } catch (error) {
                console.error('Error starting conversation:', error)
                res.status(503).json({ error: 'Agent service temporarily unavailable. Please try again later.' })
            }
        })

        app.post('/chat/:threadId', async (req: Request, res: Response) => {
            const { threadId } = req.params
            const { message } = req.body
            try {
                const response = await safeCallAgent(Client, message, threadId)
                res.json({ response })
            } catch (error) {
                console.error('Error in chat:', error)
                res.status(503).json({ error: 'Agent service temporarily unavailable. Please try again later.' })
            }
        })

        // Start server (outside of routes)
        const PORT = process.env.PORT || 8000
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`)
        })

    } catch (error) {
        console.error('Error Connecting to MongoDB:', error)
        process.exit(1)
    }
}

startServer()
