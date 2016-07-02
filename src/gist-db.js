import fs from 'fs'
import url from 'url'
import GitHubApi from 'github'
import { taffy } from 'taffydb'
import { EventEmitter } from 'events'
import request from 'request'
import config from './config'

let finalConfig = config
let db = null
let githubMeta = null
let fileInit = null
let fileSave = null
let lastCall = null
let numGistPending = -1

export default (userConfig, userFileInit, userFileSave) => {
  // merge configs
  if (typeof userConfig === 'object') {
    finalConfig = mergeConfigs(config, userConfig)
  } else if (typeof userConfig === 'function') {
    userFileInit = userConfig
    userConfig = {}
  }

  if (typeof userFileInit === 'object' || !userFileInit) {
    userFileInit = (file) => { return file }
  }

  if (typeof userFileSave === 'object' || !userFileSave) {
    userFileSave = (file, callback) => {}
  }

  fileInit = userFileInit
  fileSave = userFileSave

  db = initDb()

  db.event = new EventEmitter()

  // ADD REFRESH FUNCTION TO db
  db.refresh = refresh

  // CONNECT TO GITHUB
  db.github = new GitHubApi({
    version: finalConfig.github.version,
    timeout: config.github.timeout
  })

  if (finalConfig.github.authenticate) {
    db.github.authenticate(finalConfig.github.authenticate)
  }

  // CREATE EVENTS

  // START TIMER
  runRefresh()

  return db
}

const initDb = () => {
  if (finalConfig.local.save !== 'NEVER') {
    if (!finalConfig.local.save) {
      throw new Error('config.local.save was not set')
    }

    if (!finalConfig.local.location) {
      throw new Error('config.local.location was not set')
    }

    try {
      const localDb = JSON.parse(fs.readFileSync(finalConfig.local.location))
      if (localDb && !Array.isArray(localDb)) {
        throw new Error('Local database was not an array')
      }

      return taffy(localDb)
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err
      }

      return taffy([])
    }
  }
}

const saveDb = () => {
  // GATHER DATA
  const gistStorage = db().get()

  // SAVE DATA
  fs.writeFile(finalConfig.local.location, JSON.stringify(gistStorage))
}

const mergeConfigs = (keep, add) => {
  const keys = Object.keys(add)

  for (const key of keys) {
    if (!keep[key] || typeof add[key] !== 'object') {
      keep[key] = add[key]
    } else {
      keep[key] = mergeConfigs(keep[key], add[key])
    }
  }

  return keep
}

const runRefresh = () => {
  db.event.emit('refreshing')
  refresh(1)
  setTimeout(runRefresh, finalConfig.refreshMin * 1000 * 60)
}

const refresh = (pageNum) => {
  trackPendingGists(true, 'start of refresh')

  if (!pageNum) {
    pageNum = 1
  }

  const options = {
    user: finalConfig.github.username,
    per_page: finalConfig.github.per_page,
    page: pageNum
  }

  if (lastCall) {
    options.since = lastCall
  }

  db.github.gists.getFromUser(options, callGithub)

  trackPendingGists(false, 'end of refresh')
}

const continueRefresh = () => {
  if (githubMeta && githubMeta.link) {
    const links = githubMeta.link.split(', ')

    let next = -1

    for (const linkTag of links) {
      const linkParts = linkTag.split('; ')

      let link = linkParts[0]
      link = link.substring(1, link.length - 1)
      const details = url.parse(link, true)

      if (linkParts[1] === 'rel="next"') {
        next = details.query.page
      }
    }

    // FIGURE OUT HOW TO DO THIS IN A LOOP
    // SO A BUNCH CAN GO AT ONCE
    if (next > -1) {
      console.log('NEXT PAGE: ' + next)
      refresh(next)
    }
  }
}

const endRefresh = (err) => {
  db.event.emit('refreshed', err)
  lastCall = (new Date()).toISOString()
  if (finalConfig.local.save !== 'NEVER') {
    saveDb(db)
  }
}

const callGithub = (err, res) => {
  trackPendingGists(true, 'start of callGithub')

  if (err) {
    db.event.emit('github_error', err, res)
    endRefresh(err)
  } else {
    githubMeta = res.meta
    delete res.meta

    continueRefresh()

    trackPendingGists(true, 'gather Github Info callGithub')
    gatherGithubInfo(res, 0, 0)
  }

  trackPendingGists(false, 'end of callGithub')

  if (numGistPending === 0) {
    endRefresh()
  }
}

const getRawFile = (err, res, body, fileParams) => {
  // GATHER RAW AND SAVE FILE TO DB
  if (err) {
    fileParams.file.error = 'dropped_raw_file'
    fileParams.file.raw = null

    db.event.emit('file_error', err, fileParams.file)
  } else {
    fileParams.file.error = null
    fileParams.file.raw = body
  }

  db.merge(fileParams.file)
  fileSave(fileParams.file, (theFile) => {
    db.merge(theFile)
  })

  trackPendingGists(false, 'got file getRawFile')

  if (fileParams.fileIndex === fileParams.filenames.length - 1 && fileParams.gistIndex === fileParams.gists.length - 1 && numGistPending === 0) {
    endRefresh()
  } else {
    trackPendingGists(true, 'get raw file getRawFile')
    gatherGithubInfo(fileParams.gists, fileParams.gistIndex, fileParams.fileIndex + 1)
  }
}

const gatherGithubInfo = (gists, gistIndex, fileIndex) => {
  if (gistIndex < gists.length) {
    const gist = gists[gistIndex]

    const filenames = Object.keys(gist.files)

    if (fileIndex < filenames.length) {
      const filename = filenames[fileIndex]
      const rawFileUrl = gist.files[filename].raw_url

      let file = gist.files[filename]
      file.id = gist.id + '_' + file.filename
      file.gist_id = gist.id
      file.gist = {
        id: gist.id,
        public: gist.public,
        created_at: new Date(gist.created_at),
        updated_at: new Date(gist.updated_at),
        description: gist.description
      }

      file = fileInit(file) // returns null if it shouldn't be in the DB

      let oldFile = null
      if (file) {
        oldFile = db({id: file.id}).first()
        if (!oldFile) {
          oldFile = null
        }
      }

      if (file && (!oldFile || file.gist.updated_at.getTime() > new Date(oldFile.gist.updated_at).getTime())) {
        const fileParams = {
          file: file,
          fileIndex: fileIndex,
          filenames: filenames,
          gists: gists,
          gistIndex: gistIndex
        }
        trackPendingGists(true, 'get raw file gatherGithubInfo')
        request({uri: rawFileUrl}, (err, res, body) => { getRawFile(err, res, body, fileParams) })
      } else {
        trackPendingGists(true, 'next file gatherGithubInfo')
        gatherGithubInfo(gists, gistIndex, fileIndex + 1)
      }
    } else {
      trackPendingGists(true, 'next gist gatherGithubInfo')
      gatherGithubInfo(gists, gistIndex + 1, 0)
    }
  }

  trackPendingGists(false, 'end of gatherGithubInfo')
  if (numGistPending === 0) {
    endRefresh()
  }
}

const trackPendingGists = (add, note) => {
  if (add) {
    numGistPending === -1 ? numGistPending = 1 : numGistPending++
  } else {
    numGistPending--
  }
// console.log("ADD: "+add+" | NOTE: "+note + " | NUM: "+numGistPending)
}
