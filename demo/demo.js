'use strict'

const config = {
  github: {
    username: 'mcwhittemore'
  }
}

const fileInit = (file) => {
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

const fileSave = (file, callback) => {
  file.html = file.raw
  callback(file)
}

const db = require('../build')(config, fileInit, fileSave)

db.event.on('github_error', (err, res) => {
  console.log('github error')
  console.log(err)
  console.log()
})

db.event.on('file_error', (err, file) => {
  console.log('file error')
  console.log('FILE: ' + file.id)
  console.log('ERROR: ' + err.code)
  console.log()
})

db.event.on('refreshing', () => {
  // MIGHT WANT TO LOCK DOWN THINGS FOR A BIT
  console.log('LETS DO THIS')
})

db.event.on('refreshed', (err) => {
  if (err) {
    // error should be handled
    console.log(err)
  }
  console.log('refresh done')
  db().each((file) => {
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
