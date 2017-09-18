#!/usr/bin/env node

// ⚠️ it's a running 🚧 draft

const {cmd, download, AddOn, Application} = require('../lib/casti')

// --- Define the FS-Buckets Addon ---
let bucketAddOn = AddOn.of({
  name:"my-bucket-09182017",
  type:"fs-bucket",
  plan:"s",
  organization:"wey-yu", 
  region:"eu"
})

// --- Define the application ---
let myGitBucket = Application.of({
  name:"my-gitbucket-09182017",
  type:"war",
  flavor:"M",
  organization:"wey-yu",
  region:"par",
  envvars:["JAVA_VERSION=8", "GITBUCKET_HOME=/app/storage/.gitbucket", "PORT=8080"],
})

// === Process steps ===

let createAddOn = (nextStep) => {
  bucketAddOn.create({
    failure: error => console.log("😡 addon creation",error),
    success: out => nextStep()
  })
}

let createApplication = (nextStep) => {
  // --- Provision the application and create the local directory of the project ---
  myGitBucket.create({
    failure: error => console.log("😡 application creation", error),
    success: out => {if(nextStep) { nextStep() }}
  })
}

let linkAddonToApplication = (nextStep) => {
  // --- Link the application and the addon ---
  myGitBucket.linkToAddon({addon:bucketAddOn.name}, {
    failure: error => console.log("😡 linking", error),
    success: out => nextStep()
  })
}

let defineStorageFolder = (nextStep) => {
  // --- define a folder /storage | this may change in the future ---
  myGitBucket.attachToBucket({
    failure: error => console.log("😡 definig storage folder", error),
    success: out => nextStep()
  })
}

let getTheWarFile = (nextStep) => {
  // --- download gitbucket.war and copy it to the local directory ---
  download({
    from: "https://github.com/gitbucket/gitbucket/releases/download/4.15.0/gitbucket.war",
    to: `${myGitBucket.path}/gitbucket.war`
  }, 
  {
    failure: error => console.log("😡 copying assets", error),
    success: out => nextStep()
  })
}

let setWarNameToRun = (nextStep) => {
  // ---  set the war name to run ---
  myGitBucket.createCleverJarJsonFile({jarName:"gitbucket.war"},{
    failure: error => console.log("😡 json configuration file", error),
    success: out => nextStep()
  })
}

let initialiseRepository = (nextStep) => {
  // ---  Initialise the Git repository ---
  myGitBucket.gitInit({
    failure: error => console.log("😡 initialising git repository", error),
    success: out => nextStep()
  })
}

let deploy = () => {
  // ---  Deploy to Clever Cloud ---
  myGitBucket.gitPush({
    failure: error => console.log("😡 deploying", error),
    success: out => console.log("👏 you can now use GitBucket", out)
    // go to http://my-gitbucket.cleverapps.io
  })
}

createAddOn(
  createApplication(
    linkAddonToApplication(
      defineStorageFolder(
        getTheWarFile(
          setWarNameToRun(
            initialiseRepository(deploy)))))))


