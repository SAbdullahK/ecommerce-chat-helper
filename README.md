# AI-Agent-E-Commerce-Chatbot

An AI agent chatbot built with LangChain and Google Gemini 1.5 Flash, designed to help customers in an e-commerce store.
This project demonstrates a full-stack implementation with a TypeScript/Node.js backend, React frontend, and MongoDB database.

✨ Features

* 🤖 **AI Chatbot** – Customer queries answered using Gemini 1.5 Flash via Google AI Studio
* 🛒 **E-Commerce Integration** – Chatbot retrieves and suggests products from MongoDB
* 🔗 **LangChain Agents** – Handles structured prompts, memory, and intelligent responses
* 🌐 **Full-Stack Setup** – Separate backend (TypeScript/Express) and frontend (React.js)
* 📦 **Database Seeding** – Auto-populates MongoDB with product inventory for testing

🏗️ Tech Stack

* Backend: Node.js, TypeScript, Express
* AI/LLM: LangChain, Google Generative AI (Gemini 1.5 Flash)
* Frontend: React.js
* Database: MongoDB

📂 Project Structure

```
/server
 ├── index.ts            # Express server entry
 ├── agent.ts            # AI chatbot logic
 ├── seed-database.ts    # MongoDB seeding script
 ├── config.ts           # Config & environment setup
 ├── package.json        
 └── .env

/client
 ├── App.js              # Main React app
 ├── chatbot.js          # Chatbot UI component
 ├── e-commercestore.js  # E-commerce store component
 ├── App.css / index.js
```


Clone the repository
git clone https://github.com/your-username/AI-Agent-E-Commerce-Chatbot.git

Backend setup
cd server
npm install
npm run seed    # Seed the database
npm run dev     # Start the backend server

Frontend setup
cd ../client
npm install
npm start       # Start the React frontend


🔑 Prerequisites

Before running this project, make sure you have the following installed and set up:

Node.js
 (v18+ recommended) – for running the backend and frontend

MongoDB
 – local or cloud (e.g., MongoDB Atlas)

Git
 – to clone the repository

Google AI Studio API Key – for Gemini 1.5 Flash integration

Create a project on Google AI Studio

Generate an API key and add it to your .env file
