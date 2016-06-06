'use strict'

const config = {
  github: {
    username: 'mcwhittemore'
  }
}

const GISTDB = require('../gist-db')

const fileInit = function (file) {
  // init custom group object
  file.groups = {}

  // define groups and their regex include rules
  const groupRules = {
    'blog': /^Blog_/,
    'project': /^Project_/,
    'icon': /^Icon_$/,
    'about': /^BlogAboutPage.md$/
  }

  // get group names
  const groups = Object.keys(groupRules)

  // set file as excluded as we only want to include it if it has a group
  let include = false

  for (const group of groups) {
    const rule = groupRules[group]

    // check if filename matches regex rule
    if (file.filename.search(rule) > -1) {
      file.groups[group] = true // set included in group as true
      include = true // set include file as true
    } else {
      file.groups[group] = false
    }
  }

  if (include) {
    return file
  } else {
    return undefined
  }
}

const fileSave = function (file, callback) {
  file.html = file.raw
  callback(file)
}

const _db = GISTDB(config, fileInit, fileSave)

_db.event.on('github_error', function (err, res) {
  console.log('github error')
  console.log(err)
  console.log()
})

_db.event.on('file_error', function (err, file) {
  console.log('file error')
  console.log('FILE: ' + file.id)
  console.log('ERROR: ' + err.code)
  console.log()
})

_db.event.on('refreshing', function () {
  // MIGHT WANT TO LOCK DOWN THINGS FOR A BIT
  console.log('LETS DO THIS')
})

_db.event.on('refreshed', function (err) {
  if (err) {
    console.log(err)
  }
  console.log('refresh done')
  _db().each(function (file) {
    console.log(file.id)
    if (!file.error) {
      console.log('RAW: ' + file.raw.length + ' | HTML: ' + file.html.length)
      console.log()
    } else {
      console.log('ERROR')
      console.log()
    }
  })
})
