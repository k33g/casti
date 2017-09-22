#!/usr/bin/env node

const {cmd, download, AddOn, Application} = require('../lib/casti')

// --- Define the application ---
let myRocketChat = Application.of({
  name:"my-rocketchat-20170922-05",
  type:"node",
  flavor:"S",
  organization:"wey-yu",
  region:"par",
  envvars:[
    "ADMIN_EMAIL=john.doe@gmail.com", 
    "ADMIN_USERNAME=john",
    "ADMIN_PASS=root", 
    "ROOT_URL=http://localhost:8080",
    "PORT=8080",
    "CC_PRE_BUILD_HOOK=./install.sh"
  ]
})

// --- Define the MongoDB Addon ---
let mongoDbAddOn = AddOn.of({
  name:"my-mongodb-20170922-05",
  type:"mongodb-addon",
  plan:"peanut", 
  organization:"wey-yu", 
  region:"eu"
})

// --- Steps ---
async function deployRocketChat() {
  await mongoDbAddOn.create()
  await myRocketChat.create()

  await myRocketChat.linkToAddon({name: mongoDbAddOn.name})

  var envvars = await myRocketChat.getEnvironmentVariables()

  await myRocketChat.setEnvironmentVariable({
    envvar:`MONGO_URL=${envvars.find(item => item.name == "MONGODB_ADDON_URI").value}`
  })

  await myRocketChat.createExecutableShellScript({
    scriptName: "install.sh",
    shell:`
      echo "👋 RocketChat setup and deployment is started"
      curl -L https://rocket.chat/releases/latest/download -o rocket.chat.tgz
      tar zxvf rocket.chat.tgz
      mv bundle Rocket.Chat
      cd Rocket.Chat/programs/server/
      npm install --production
    `
  })

  await myRocketChat.createFile({
    fileName: "package.json",
    source:`
      {
        "name": "rocket-chat-server",
        "scripts": {
          "start": "node Rocket.Chat/main.js"
        },
        "engines": { "node": "^4" }
      }
    `
  })

  await myRocketChat.gitInit()
  await myRocketChat.gitPush()

}

deployRocketChat()
  .then(res => {
    console.log("😀 Deployment ok")
    console.log(`🌍 http://${myRocketChat.name}.cleverapps.io`)
  })
  .catch(error => console.log("😡 ouch!", error))