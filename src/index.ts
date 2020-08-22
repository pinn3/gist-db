import { Octokit } from '@octokit/rest'

class Database {
  _octokit: Octokit;
  _collections?: { [key: string]: string };

  constructor(accessToken: string) {
    this._octokit = new Octokit({
      auth: accessToken,
    })
  }

  async _loadCollections() {
    const { data } = await this._octokit.gists.list()
    this._collections = data
      .filter(gist => gist.description?.startsWith('gistdb:'))
      .reduce((collectionsByName, gist) => ({
        ...collectionsByName,
        [gist.description.replace('gistdb:', '')]:  gist.id,
      }), {})
  }

  async getCollection(collectionName: string) {
    if (!this._collections) {
      await this._loadCollections()
    }

    const collectionId = this._collections?.[collectionName]
    if (!collectionId) {
      throw new Error(`No collection named ${collectionName}`)
    }

    const collection = await this._octokit.gists.get({ gist_id: collectionId })
    return collection
  }
}

export default Database