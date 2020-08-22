const GistDB = require('../lib').default

if (!process.env.GITHUB_ACCESS_TOKEN) {
   throw new Error('No GITHUB_ACCESS_TOKEN environment variable provided')
   process.exit(1)
}

const db = new GistDB(process.env.GITHUB_ACCESS_TOKEN)

async function main() {
  try {
    const collection = await db.getCollection('test_collection')
    console.log(collection)
  } catch (error) {
    console.log(error)
  }
}

main()
