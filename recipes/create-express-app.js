#!/usr/bin/env node

/**
 * Script the Clever Cloud CLI with JavaScript
 * Only tested on OSX
 * Probably ok with Linux
 * Some 🚧 to do with window
 */

const cmd = require('../lib/casti.js').cmd

/**
 * Application informations
 */
let applicationName = "killer-app-demo-bis"
let organization = "wey-yu"
let region = "par"

let applicationPath = `${process.cwd()}/${applicationName}`
console.log(`${process.cwd()}/${applicationName}`)

/**
 * Create a nodejs project
 * 💡 you can git clone a project too
 */
cmd({
  script: `
    # === create repository ===
    mkdir ${applicationPath}
    cd ${applicationPath}

    # === create .gitignore file ===
    cat > .gitignore << EOF
    node_modules/
    npm-debug.log
    .clever.json
    EOF

    # === create package.json ===
    cat > package.json << EOF
    {
      "name": "${applicationName}",
      "version": "1.0.0",
      "scripts": {
        "start": "node index.js"
      },
      "main": "index.js",
      "dependencies": {
        "body-parser": "^1.17.2",
        "express": "^4.15.3"
      }
    }
    EOF   
    
    # === create index.js ===
    cat > index.js << EOF
    const express = require("express");
    const bodyParser = require("body-parser");
    
    let port = process.env.PORT || 8080;
    
    let app = express();
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({extended: false}))
    
    app.get('/', (req, res) => {
      res.send("<h1>Hey 👋 people!</h1>");
    })
    
    app.get('/hello', (req, res) => {
      res.send({message:"hello 🌍"});
    })
        
    app.listen(port)
    console.log("🌍 Web Server is started - listening on ", port)
    EOF    
  `,
  failure: error => console.log("1- 😡 something wrong when creating the project", error),
  success: out => console.log("1- 🙂 project created")
})

/**
 * Application provisioning
 */
cmd({
  script: `
    cd ${applicationPath};
    clever create -t node "${applicationName}" --org ${organization} --region ${region} --alias "${applicationName}"
    clever env set PORT 8080 --alias "${applicationName}"
    clever domain add ${applicationName}.cleverapps.io --alias "${applicationName}"  
    clever scale --flavor pico --alias "${applicationName}"
  `,
  failure: error => console.log("2- 😡 something wrong when provisioning the application", error),
  success: out => {
    console.log("2- 😍 Application provisioning ok", out)
    /**
     * Clever Tools create a `.clever.json` with application information
     */
    let config = require(`${applicationPath}/.clever.json`).apps[0]
    let app_id = config.app_id // Clever application Id

    /**
     * Prepare Git repository
     */
    cmd({
      script: `
        cd ${applicationPath}
        git init
        git add .
        git commit -m "First 🚀 of ${applicationName}"
        git remote add clever git+ssh://git@push-par-clevercloud-customers.services.clever-cloud.com/${app_id}.git
      `,
      failure: error => console.log("3- 😡 something wrong when initialzing the repository", error),
      success: out => {
        console.log("3- 🤣 git repository initialized", out)

        /**
         * Deploy Application on Clever-Cloud
         */
        cmd({
          script: `
            cd ${applicationPath}
            echo "⌛️ wait a little..."
            git push clever master
          `,
          failure: error => console.log("4- 😡 something wrong when deploying the application", error),
          success: out => {
            console.log("4- 🍻 project is deploying", out)
            console.log(`see 🌍 http://${applicationName}.cleverapps.io`)
          }
        })
      }
    })

  }
})




