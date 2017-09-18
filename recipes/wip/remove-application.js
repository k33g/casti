#!/usr/bin/env node

const cmd = require('../lib/casti.js').cmd
// remove by name
let applicationName = "my_gb_31"
//let organization = "wey-yu"
let applicationPath = `${process.cwd()}/${applicationName}`
console.log(applicationPath, `${process.cwd()}/${applicationName}`)


cmd({
  script: `
    cd ${applicationPath}
    clever delete ${applicationName} --yes --verbose
  `,
  failure: error => console.log("😡 something wrong when removing the application", error),
  success: out => console.log("😍 application removal ok", out)
})
