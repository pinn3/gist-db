'use strict'

const url = require('url')

const GitHubApi = require('github')
const TAFFY = require('taffydb').taffy
const EventEmitter = require('events').EventEmitter
const request = require('request')

let config = require('./config')

let _db = null
let githubMeta = null
let fileInit = null
let fileSave = null
let lastCall = null
let numGistPending = -1

module.exports = (userConfig, userFileInit, userFileSave) => {
  // merge configs
  if (typeof userConfig === 'object') {
    config = mergeConfigs(config, userConfig)
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

  _db = initDB()

  _db.event = new EventEmitter()

  // ADD REFRESH FUNCTION TO _db
  _db.refresh = refresh

  // CONNECT TO GITHUB
  _db.github = new GitHubApi({
    version: config.github.version,
    timeout: config.github.timeout
  })

  if (config.github.authenticate) {
    _db.github.authenticate(config.github.authenticate)
  }

  // CREATE EVENTS

  // START TIMER
  runRefresh()

  return _db
}

const initDB = () => {
  let data = []

  if (config.local.save !== 'NEVER') {
    if (!config.local.save) {
      // EMIT SOME ERR
    } else {
      // OPEN FILE

      // CONVERT STRING TO OBJECT

      // CHECK OBJECT IS ARRAY

    // SET DATA TO OBJECT
    }
  }

  return TAFFY(data)
}

const saveDB = () => {

  // GATHER DATA

  // TURN DATA INTO A STRING

  // SAVE DATA

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
  _db.event.emit('refreshing')
  refresh(1)
  setTimeout(runRefresh, config.refreshMin * 1000 * 60)
}

const refresh = (pageNum) => {
  trackPendingGists(true, 'start of refresh')

  if (!pageNum) {
    pageNum = 1
  }

  const options = {
    user: config.github.username,
    per_page: config.github.per_page,
    page: pageNum
  }

  if (lastCall) {
    options.since = lastCall
  }

  _db.github.gists.getFromUser(options, callGithub)

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
  _db.event.emit('refreshed', err)
  lastCall = (new Date()).toISOString()
  if (config.local.save !== 'NEVER') {
    saveDB()
  }
}

const callGithub = (err, res) => {
  trackPendingGists(true, 'start of callGithub')

  if (err) {
    _db.event.emit('github_error', err, res)
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

    _db.event.emit('file_error', err, fileParams.file)
  } else {
    fileParams.file.error = null
    fileParams.file.raw = body
  }

  _db.merge(fileParams.file)
  fileSave(fileParams.file, (theFile) => {
    _db.merge(theFile)
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
        oldFile = _db({id: file.id}).first()
        if (!oldFile) {
          oldFile = null
        }
      }

      if (file && (!oldFile || file.gist.updated_at.getTime() > oldFile.gist.updated_at.getTime())) {
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
