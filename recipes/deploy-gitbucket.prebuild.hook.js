#!/usr/bin/env node

const {cmd, download, AddOn, Application} = require('../lib/casti')

// --- Define the FS-Buckets Addon ---
let bucketAddOn = AddOn.of({
  name:"my-bucket-09222017-09",
  type:"fs-bucket",
  plan:"s",
  organization:"wey-yu", 
  region:"eu"
})

// --- Define the application ---
let myGitBucket = Application.of({
  name:"my-gitbucket-09222017-09",
  type:"war",
  flavor:"M",
  organization:"wey-yu",
  region:"par",
  envvars:["JAVA_VERSION=8", "GITBUCKET_HOME=/app/storage/.gitbucket", "PORT=8080"],
})

// --- Steps ---
async function deployGitBucket() {
  await bucketAddOn.create();
  await myGitBucket.create();
  await myGitBucket.connectToBucket({name:bucketAddOn.name, path:"storage"})

  await myGitBucket.createExecutableShellScript({
    scriptName: "install.sh",
    shell:`
      #!/bin/sh
      echo "GitBucket setup and deployment is started"
      curl -L https://github.com/gitbucket/gitbucket/releases/download/4.15.0/gitbucket.war --output gitbucket.war
    `
  })
  
  await myGitBucket.addPreBuildHook({hook:"./install.sh"})
  await myGitBucket.createCleverJarJsonFile({jarName:"gitbucket.war"});
  await myGitBucket.gitInit();
  await myGitBucket.gitPush();

}

deployGitBucket()
  .then(res => {
    console.log("😀 Deployment ok")
    console.log(`🌍 http://${myGitBucket.name}.cleverapps.io`)
  })
  .catch(error => console.log("😡 ouch!", error))


