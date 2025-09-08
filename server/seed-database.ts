//import "dotenv/config"
import dotenv from "dotenv";
dotenv.config();

import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai"
//import { StructuredOutputParser} from "@langchain/core/output_parser"
//import { StructuredOutputParser } from "@langchain/core/output_parsers"
//import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { StructuredOutputParser } from "langchain/output_parsers";


import { MongoClient } from "mongodb"
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb"
import { z } from "zod"
//import "dotenv/config"

// const Client = new MongoClient(process.env.MONGODB_ATLAS_URI as string);

// const llm = new ChatGoogleGenerativeAI({
//     model: "gemini-1.5-flash",
//     temperature: 0.7,
//     apiKey: process.env.GOOGLE_API_KEY as string
// })
if (!process.env.GOOGLE_API_KEY || !process.env.MONGODB_ATLAS_URI) {
  throw new Error("Missing required environment variables");
}

const Client = new MongoClient(process.env.MONGODB_ATLAS_URI);
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash",
  temperature: 0.7,
  apiKey: process.env.GOOGLE_API_KEY,
});


const itemSchema = z.object ({
    item_id: z.string(),
    item_name: z.string(),
    item_description: z.string(),
    brand: z.string(),

    manufacturer_address: z.object({
        street: z.string(),
        city: z.string(),
        state: z.string(),
        postal_code: z.string(),
        country: z.string(),
    }),

    prices: z.object({
        full_price: z.number(),
        sale_price: z.number()
    }),

    categories: z.array(z.string()),
    user_reviews: z.array(
        z.object({
            review_date: z.string(),
            rating: z.number(),
            Comment: z.string(),
        })
    ),

    notes: z.string(),
})

 
    type Item = z.infer<typeof itemSchema>

    //const parser =  StructuredOutputParser.fromZodSchema(z.array(itemSchema))
    const parser = StructuredOutputParser.fromZodSchema(z.array(itemSchema));


    async function setupDatabaseAndCollection(): Promise<void> {
        console.log("Setting up database and collection...")
        const db = Client.db("inventory_database")
        const collections = await db.listCollections({ name: "item" }).toArray()
        
        if (collections.length === 0) {
            await db.createCollection("item")
            console.log("Created 'items' in 'inventory_database' database ")
        } else {
            console.log("'items' already exists in 'inventory_database' database")
        }
    }  
    
    // async function createVectorSearchIndex(): Promise<void> {
    //     try {
    //         const db = Client.db("inventory_database")
    //         const collection = db.collection("item")
    //         await collection.dropIndexes()
    //         const vectorSearchIdx = {
    //             name: "vector_name",
    //             type: "vector_search",
    //             definition: {
    //                 "fields": [ {
    //                     "type": "vector",
    //                     "path": "embedding",
    //                     "numDimensions": 768,
    //                     "similarity": "cosine"
    //             }]
    //             }
    //         }
            
      //          console.log("Creating vector search index...")
    //             await collection.createSearchIndex(vectorSearchIdx);
    //             console.log("Sucessfully created vector search index");
    //     } catch (error) {
    //         console.error('Failed to create vector search index:', error)
            
    //     }
    // }

    async function createVectorSearchIndex(): Promise<void> {
  try {
    const db = Client.db("inventory_database");
    const collection = db.collection("item");

    // Check if the index already exists
    const indexes = await collection.listIndexes().toArray();
    const hasVectorIndex = indexes.some(idx => idx.name === "vector_index");

    if (!hasVectorIndex) {
      console.log("Creating vector search index...");
      await collection.createSearchIndex({
        name: "vector_index",
        definition: {
          mappings: {
            dynamic: true,
            fields: {
              embedding: {
                type: "knnVector",
                dimensions: 768,
                similarity: "cosine"
              }
            }
          }
        }
      });
      console.log("Successfully created vector search index");
    } else {
      console.log("Skipping index creation (already exists).");
    }
  } catch (error) {
    console.error("Failed to create vector search index:", error);
  }
}


//         async function createVectorSearchIndex(): Promise<void> {
//     console.log("Skipping index creation (already created in Atlas).");
// }


    async function generateSyntheticDatabase(): Promise<Item[]> {
    const prompt = `
You are a helpful assistant that generates furniture store item data.
Generate 10 furniture store items.
Each item must include the following fields:
- item_id
- item_name
- item_description
- brand
- manufacturer_address
- prices
- categories
- user_reviews
- notes

Ensure variety in the data and realistic values.

${parser.getFormatInstructions()}
    `;

    console.log("Generating synthetic data...");
    const response = await llm.invoke(prompt);
    return parser.parse(response.content as string);
}

async function createItemSummary(item: Item): Promise<string> {
    return new Promise((resolve)=>{
        const manufacturerDetails = `Made in ${item.manufacturer_address.country}`
        const categories = item.categories.join(", ")
        const userReviews = item.user_reviews.map((review)=>
            `Rated ${review.rating} on ${review.review_date}: ${review.Comment}`).join(" ")
        const basicInfo = `${item.item_name} ${item.item_description} from the brand ${item.brand}`
        const price = `At full price costs: ${item.prices.full_price} USD, On sale it costs ${item.prices.sale_price} USD`
        const notes = item.notes

    const summary = `${basicInfo}. Manufacturer: ${manufacturerDetails}. Categories: ${categories}. Rewiews: ${userReviews}. Price: ${price}. Notes: ${notes}`

    resolve(summary)
    }) 
    
}


    async function seedDatabase(): Promise<void> {
        try {
            await Client.connect()
            await Client.db("admin").command({ ping: 1 })
            console.log("You sucesfully to MongoDB...")

            await setupDatabaseAndCollection()
            await createVectorSearchIndex()
            
            const db = Client.db("inventory_database")
            const collection =  db.collection("item")

            await collection.deleteMany({})
            console.log("Cleared existing data from items colection")

            const syntheticData = await generateSyntheticDatabase()
            
            const recordsWithSummaries = await Promise.all(syntheticData.map(async (record)=>({
                pageContent: await createItemSummary(record),
                metadata:{...record}
            })))

            for (const record of recordsWithSummaries) {
                await MongoDBAtlasVectorSearch.fromDocuments(
                    [record],
                    new GoogleGenerativeAIEmbeddings({
                        apiKey: process.env.GOOGLE_API_KEY,
                        modelName: "text-embedding-004"
                    }),
                    {
                        collection,
                        indexName: "vector_index",
                        textKey: "embedding_text",
                        embeddingKey: "embedding"
                    }
                )
                console.log("Successfully processed & saved record:", record.metadata.item_id)
            }
            console.log("Database seeding completed...")

        } catch (error) {
            console.log("Error seeding Database: " ,error)
        } finally {
            await Client.close()
        }
    
}

seedDatabase().catch(console.error)