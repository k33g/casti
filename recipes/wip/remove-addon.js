#!/usr/bin/env node

const cmd = require('../lib/casti.js').cmd
// remove by name
let name = "mdb02"
let organization = "wey-yu"

cmd({
  script: `clever addon delete ${name} --org ${organization} --yes --verbose`,
  failure: error => console.log("😡 something wrong when removing the addon", error),
  success: out => console.log("😍 addon removal ok", out)
})
