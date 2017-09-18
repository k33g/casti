#!/usr/bin/env node

const {cmd, download, AddOn, Application} = require('../lib/casti')

// --- Define the FS-Buckets Addon ---
let bucketAddOn = AddOn.of({
  name:"my-bucket-09182017-05",
  type:"fs-bucket",
  plan:"s",
  organization:"wey-yu", 
  region:"eu"
})

// --- Define the application ---
let myGitBucket = Application.of({
  name:"my-gitbucket-09182017-05",
  type:"war",
  flavor:"M",
  organization:"wey-yu",
  region:"par",
  envvars:["JAVA_VERSION=8", "GITBUCKET_HOME=/app/storage/.gitbucket", "PORT=8080"],
})

// --- Steps ---
bucketAddOn.create().then(res => {
  console.log("1- 😀 Bucket ok")
  // Provision the application and create the local directory of the project
  myGitBucket.create().then(res => {
    console.log("2- 😀 Application ok")
    // Link the application and the addon
    myGitBucket.linkToAddon({name:bucketAddOn.name}).then(res => {
      console.log("3- 😀 Addon linked ok")
      // Extract environment variables
      myGitBucket.getEnvironmentVariables().then(envvars => {
        console.log("4- 😀 Environment variables ok")
        // Define a folder /storage
        myGitBucket.attachStorageFolderToBucket({envvars:envvars}).then(res => {
          console.log("5- 😀 Storage folder ok")
          // Download gitbucket.war and copy it to the local directory
          download({
            from: "https://github.com/gitbucket/gitbucket/releases/download/4.15.0/gitbucket.war",
            to: `${myGitBucket.path}/gitbucket.war`
          }).then(res => {
            console.log("6- 😀 File downloaded ok")
            // Set the war name to run
            myGitBucket.createCleverJarJsonFile({jarName:"gitbucket.war"}).then(res => {
              console.log("7- 😀 Json file ok")
              // Initialise the Git repository
              myGitBucket.gitInit().then(res => {
                console.log("8- 😀 Git repository ok")
                // Deploy to Clever Cloud
                myGitBucket.gitPush().then(res => {
                  console.log("9- 😀 Git push ok")
                  console.log(`🌍 http://${myGitBucket.name}.cleverapps.io`)

                }).catch(error => console.log("😡 git push", error))
              }).catch(error => console.log("😡 git init", error))
            }).catch(error => console.log("😡 json file", error))
          }).catch(error => console.log("😡 downloading file", error))
        }).catch(error => console.log("😡 storage folder", error))
      }).catch(error => console.log("😡 environment variables", error))
    }).catch(error => console.log("😡 linking addon", error))
  }).catch(error => console.log("😡 application creation", error))
}).catch(error => console.log("😡 addon creation",error))
