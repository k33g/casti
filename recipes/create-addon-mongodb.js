#!/usr/bin/env node

/**
 * Script the Clever Cloud CLI with JavaScript
 * Only tested on OSX
 * Probably ok with Linux
 * Some 🚧 to do with window
 */

const cmd = require('../lib/casti.js').cmd

/**
 * create mongodb addon on clever
 */

let addMongoDb = ({name, plan, organization, region}, {failure, success}) => {
  let addon = {name, plan, organization, region}
  let script = `clever addon create mongodb-addon "${name}" --plan ${plan} --org ${organization} --region ${region}`
  cmd({
    script: script,
    failure: error => failure(addon, error),
    success: out => success(addon, out)
  })
}

addMongoDb({
  name:"my-mongodb", 
  plan:"peanut", 
  organization:"wey-yu", 
  region:"eu"
},{
  failure: (addon, error) => console.log(`😡 ${error}`),
  success: (addon, out) => console.log(`🙂 addon ${addon.name} created`)
})
